import { Response } from "express";
import Bill from "../models/Bill";
import Order from "../models/Order";
import Table from "../models/Table";
import Customer from "../models/Customer";
import { AuthRequest } from "../middleware/auth";
import { getIO } from "../utils/socket";
import mongoose from "mongoose";

const generateBillNumber = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `BILL-${timestamp.slice(-6)}${random}`;
};

export const createBill = async (req: AuthRequest, res: Response) => {
  try {
    const {
      tableId,
      paymentMethods,
      discount = 0,
      selectedOrders,
      customerId,
    } = req.body;

    if (
      !tableId ||
      !paymentMethods ||
      !Array.isArray(paymentMethods) ||
      paymentMethods.length === 0
    ) {
      return res.status(400).json({
        message: "Table ID and payment methods are required",
      });
    }

    // Validate payment methods
    const totalPayment = paymentMethods.reduce(
      (sum: number, method: any) =>
        sum + (parseFloat(method.amount.toString()) || 0),
      0
    );
    if (totalPayment <= 0) {
      return res.status(400).json({
        message: "Total payment amount must be greater than 0",
      });
    }

    // Check if credit payment is used and validate customer
    const creditPayment = paymentMethods.find(
      (method: any) => method.type === "Credit"
    );
    let customer = null;

    if (creditPayment) {
      if (!customerId) {
        return res.status(400).json({
          message: "Customer must be selected when using credit payment",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }

      customer = await Customer.findById(customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      if (!customer.isActive) {
        return res
          .status(400)
          .json({ message: "Customer account is inactive" });
      }
    }

    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    // Get served orders for this table
    let query: any = { tableId, status: "Served" };

    // If specific orders are selected, filter by those
    if (selectedOrders && Array.isArray(selectedOrders)) {
      query._id = { $in: selectedOrders };
    }

    const allServedOrders = await Order.find(query).populate("items.itemId");

    if (allServedOrders.length === 0) {
      return res.status(400).json({
        message: "No served orders found for this table",
      });
    }

    // Check if there are unbilled served orders
    const servedOrders = allServedOrders.filter((order) => !order.isBilled);
    const billedServedOrders = allServedOrders.filter(
      (order) => order.isBilled
    );

    if (servedOrders.length === 0) {
      if (billedServedOrders.length > 0) {
        return res.status(400).json({
          message:
            "This table has already been billed. Orders are already processed.",
        });
      } else {
        return res.status(400).json({
          message: "No unbilled served orders found for this table",
        });
      }
    }

    let subtotal = 0;
    for (const order of servedOrders) {
      for (const item of order.items) {
        subtotal += item.totalPrice;
      }
    }

    const taxRate = 0.0; // No tax
    const tax = subtotal * taxRate;
    const discountAmount = parseFloat(discount.toString()) || 0;

    // Validate discount doesn't exceed subtotal + tax
    if (discountAmount > subtotal + tax) {
      return res.status(400).json({
        message: `Discount (रू ${discountAmount.toFixed(
          2
        )}) cannot exceed bill subtotal + tax (रू ${(subtotal + tax).toFixed(
          2
        )})`,
      });
    }

    // Validate payment doesn't exceed bill total
    const total = subtotal + tax - discountAmount;
    if (totalPayment > total) {
      return res.status(400).json({
        message: `Payment total (रू ${totalPayment.toFixed(
          2
        )}) cannot exceed bill total (रू ${total.toFixed(2)})`,
      });
    }

    // Validate that payment methods total matches bill total
    if (Math.abs(totalPayment - total) > 0.01) {
      return res.status(400).json({
        message: `Payment total (रू ${totalPayment.toFixed(
          2
        )}) does not match bill total (रू ${total.toFixed(2)})`,
      });
    }

    const creditAmount = creditPayment
      ? parseFloat(creditPayment.amount.toString()) || 0
      : 0;

    const bill = new Bill({
      tableId,
      orders: servedOrders.map((order) => order._id),
      subtotal,
      tax,
      discount: discountAmount,
      total,
      paymentMethods: paymentMethods.map((method: any) => ({
        type: method.type,
        amount: parseFloat(method.amount.toString()) || 0,
      })),
      billNumber: generateBillNumber(),
      customerId: customerId || undefined,
      creditAmount,
    });

    await bill.save();
    await bill.populate("tableId orders");

    // Handle credit transaction if credit payment is used
    if (creditPayment && customer && creditAmount > 0) {
      customer.creditBalance += creditAmount;
      customer.totalCreditGiven += creditAmount;
      customer.creditTransactions.push({
        type: "Credit",
        amount: creditAmount,
        billId: bill._id as mongoose.Types.ObjectId,
        description: `Credit from Bill #${bill.billNumber}`,
        createdAt: new Date(),
      });
      await customer.save();
    }

    // Mark orders as billed and move to history
    const updatePromises = servedOrders.map((order) =>
      Order.findByIdAndUpdate(order._id, {
        isBilled: true,
        billedAt: new Date(),
        billId: bill._id,
      })
    );
    await Promise.all(updatePromises);

    // Update table status to Available
    await Table.findByIdAndUpdate(tableId, { status: "Available" });

    // Emit real-time updates
    const io = getIO();
    io.emit("billCreated", bill);
    io.emit("tableStatusUpdate", { tableId, status: "Available" });

    // Trigger bill printing
    try {
      await printBill(bill);
    } catch (printError) {
      console.error("Print bill error:", printError);
      // Don't fail bill creation if printing fails
    }

    res.status(201).json(bill);
  } catch (error) {
    console.error("Create bill error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getBillsByTable = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;

    const bills = await Bill.find({ tableId })
      .populate("tableId")
      .populate("orders")
      .sort({ createdAt: -1 });

    res.json(bills);
  } catch (error) {
    console.error("Get bills by table error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllBills = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, limit } = req.query;

    let filter: any = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    const bills = await Bill.find(filter)
      .populate("tableId")
      .sort({ createdAt: -1 })
      .limit(limit ? parseInt(limit as string) : 100);

    res.json(bills);
  } catch (error) {
    console.error("Get all bills error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getBill = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const bill = await Bill.findById(id)
      .populate("tableId")
      .populate({
        path: "orders",
        populate: {
          path: "items.itemId",
        },
      });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.json(bill);
  } catch (error) {
    console.error("Get bill error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getBillPreview = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;
    const { discount = 0, selectedOrders } = req.query;

    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    // Get served orders for this table
    let query: any = { tableId, status: "Served" };

    // If specific orders are selected, filter by those
    if (selectedOrders) {
      const orderIds = (selectedOrders as string).split(",");
      query._id = { $in: orderIds };
    }

    const servedOrders = await Order.find(query).populate(
      "items.itemId waiterId",
      "name"
    );

    if (servedOrders.length === 0) {
      return res.status(400).json({
        message: "No served orders found for this table",
      });
    }

    // Check if selected orders are already billed
    const billedServedOrders = servedOrders.filter((order) => order.isBilled);
    const unbilledServedOrders = servedOrders.filter(
      (order) => !order.isBilled
    );

    if (unbilledServedOrders.length === 0 && billedServedOrders.length > 0) {
      return res.status(400).json({
        message:
          "This table has already been billed. Cannot generate new bill preview.",
        alreadyBilled: true,
      });
    }

    let subtotal = 0;
    const orderDetails = [];

    // Only process unbilled served orders
    for (const order of unbilledServedOrders) {
      let orderTotal = 0;
      const items = [];

      for (const item of order.items) {
        orderTotal += item.totalPrice;
        items.push({
          name: (item.itemId as any)?.name || "Unknown Item",
          quantity: item.quantity,
          price: item.itemPrice,
          total: item.totalPrice,
          notes: item.notes,
          selectedVariation: item.selectedVariation,
          addOns: item.addOns,
        });
      }

      subtotal += orderTotal;
      orderDetails.push({
        orderNumber: order.orderNumber,
        orderTime: order.createdAt,
        waiter: (order.waiterId as any)?.name || "Unknown",
        items,
        orderTotal,
      });
    }

    const taxRate = 0.0; // No tax
    const tax = subtotal * taxRate;
    const discountAmount = parseFloat(discount as string) || 0;
    const total = subtotal + tax - discountAmount;

    const preview = {
      table: {
        number: table.tableNumber,
        _id: table._id,
      },
      orders: orderDetails,
      subtotal,
      tax,
      taxRate: taxRate * 100,
      discount: discountAmount,
      total,
      orderCount: unbilledServedOrders.length,
      createdAt: new Date(),
      alreadyBilled: false,
    };

    res.json(preview);
  } catch (error) {
    console.error("Get bill preview error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const printBillById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const bill = await Bill.findById(id)
      .populate("tableId")
      .populate({
        path: "orders",
        populate: {
          path: "items.itemId waiterId",
          select: "name",
        },
      });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    await printBill(bill);
    res.json({ message: "Bill printed successfully" });
  } catch (error) {
    console.error("Print bill by ID error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const printBill = async (bill: any) => {
  const printContent = generateBillPrintContent(bill);

  // Here you would integrate with your actual thermal printer
  // For now, we'll log the content in a compact format
  console.log("=".repeat(32));
  console.log("CUSTOMER BILL - THERMAL PRINT");
  console.log("=".repeat(32));
  console.log(printContent);
  console.log("=".repeat(32));

  // You can integrate with thermal printer libraries like 'node-thermal-printer'
  // or send to a print service with 80mm paper width formatting
};

const generateBillPrintContent = (bill: any): string => {
  const now = new Date();
  const billTime = new Date(bill.createdAt);

  // 80mm thermal printer has approximately 32 characters width
  let content = `
RESTAURANT NAME
123 Main Street
City, State 12345
Tel: (555) 123-4567
================================
         CUSTOMER BILL
================================
Bill #: ${bill.billNumber}
Table: ${bill.tableId?.tableNumber || "N/A"}
Date: ${billTime.toLocaleDateString()}
Time: ${billTime.toLocaleTimeString()}
Cashier: ${bill.waiterId?.name || "N/A"}

ITEMS:
--------------------------------`;

  if (bill.orders && bill.orders.length > 0) {
    bill.orders.forEach((order: any) => {
      content += `\nOrder #${order.orderNumber}`;
      if (order.waiterId?.name) {
        content += `\nWaiter: ${order.waiterId.name}`;
      }
      content += "\n";

      order.items.forEach((item: any) => {
        const itemName = item.itemId?.name || "Unknown Item";
        const qty = item.quantity;
        const price = item.totalPrice;

        // Format: "Item Name x2    $12.50"
        const itemLine = `${itemName.substring(0, 20)} x${qty}`;
        const priceStr = `रू ${price.toFixed(2)}`;
        const spaces = Math.max(1, 32 - itemLine.length - priceStr.length);
        content += `${itemLine}${" ".repeat(spaces)}${priceStr}\n`;

        if (item.selectedVariation) {
          content += `  + ${item.selectedVariation}\n`;
        }
        if (item.addOns && item.addOns.length > 0) {
          content += `  + ${item.addOns.join(", ")}\n`;
        }
        if (item.notes) {
          content += `  Note: ${item.notes}\n`;
        }
      });
      content += "\n";
    });
  }

  content += `--------------------------------
Subtotal:              रू ${bill.subtotal.toFixed(2)}
Tax (0%):             रू ${bill.tax.toFixed(2)}`;

  if (bill.discount > 0) {
    content += `\nDiscount:             -रू ${bill.discount.toFixed(2)}`;
  }

  content += `
================================
TOTAL:                 रू ${bill.total.toFixed(2)}
================================
Payment: ${bill.paymentType}

Thank you for dining with us!
Please come again!

Print Time: ${now.toLocaleTimeString()}
================================
`;

  return content;
};
