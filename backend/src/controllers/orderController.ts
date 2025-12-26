import { Response } from "express";
import Order from "../models/Order";
import Table from "../models/Table";
import MenuItem from "../models/MenuItem";
import { AuthRequest } from "../middleware/auth";
import { getIO } from "../utils/socket";
import mongoose from "mongoose";

const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${timestamp.slice(-6)}${random}`;
};

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId, items, sessionId } = req.body;
    const waiterId = req.user?.id;

    if (!tableId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Table ID and items are required",
      });
    }

    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    let processedItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.itemId);
      if (!menuItem) {
        return res.status(404).json({
          message: `Menu item ${item.itemId} not found`,
        });
      }

      let itemPrice = menuItem.price;

      if (item.selectedVariation) {
        const variation = menuItem.variations?.find(
          (v) => v.name === item.selectedVariation
        );
        if (variation) {
          itemPrice = variation.price;
        }
      }

      let addOnTotal = 0;
      if (item.addOns && Array.isArray(item.addOns)) {
        for (const addOnName of item.addOns) {
          const addOn = menuItem.addOns?.find((ao) => ao.name === addOnName);
          if (addOn) {
            addOnTotal += addOn.price;
          }
        }
      }

      const totalPrice = (itemPrice + addOnTotal) * item.quantity;

      processedItems.push({
        itemId: item.itemId,
        quantity: item.quantity,
        notes: item.notes || "",
        selectedVariation: item.selectedVariation,
        addOns: item.addOns || [],
        itemPrice: itemPrice,
        addOnPrice: addOnTotal,
        totalPrice,
      });
    }

    const totalAmount = processedItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    const order = new Order({
      tableId,
      items: processedItems,
      status: "Pending",
      orderNumber: generateOrderNumber(),
      waiterId,
      sessionId: sessionId || new mongoose.Types.ObjectId().toString(),
      totalAmount,
    });

    await order.save();
    await order.populate("tableId items.itemId waiterId");

    await Table.findByIdAndUpdate(tableId, { status: "Occupied" });

    const io = getIO();
    io.emit("newOrder", order);
    io.emit("tableStatusUpdate", { tableId, status: "Occupied" });

    // Trigger print for the order
    try {
      await printOrder(order);
    } catch (printError) {
      console.error("Print order error:", printError);
      // Don't fail the order creation if printing fails
    }

    res.status(201).json(order);
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getOrdersByTable = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;
    const { status } = req.query;

    let filter: any = { tableId };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate("tableId")
      .populate("items.itemId")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error("Get orders by table error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { status, limit } = req.query;

    let filter: any = {};
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate("tableId")
      .populate("items.itemId")
      .populate("waiterId", "name")
      .sort({ createdAt: -1 })
      .limit(limit ? parseInt(limit as string) : 100);

    res.json(orders);
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate("tableId")
      .populate("items.itemId")
      .populate("waiterId", "name");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    console.error("Get order by ID error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    // Get current order to check current status
    const currentOrder = await Order.findById(id);
    if (!currentOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Prevent status regression - can't go backwards in the workflow
    const statusOrder = ["Pending", "Cooking", "Ready", "Served"];
    const currentStatusIndex = statusOrder.indexOf(currentOrder.status);
    const newStatusIndex = statusOrder.indexOf(status);

    // Allow only forward progression - no backward status changes allowed for anyone
    if (newStatusIndex < currentStatusIndex) {
      return res.status(400).json({
        message: `Cannot change status from ${currentOrder.status} to ${status}. Status can only progress forward.`,
      });
    }

    // Prevent status change if order is already billed
    if (currentOrder.isBilled) {
      return res.status(400).json({
        message: "Cannot change status of billed orders",
      });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate("tableId items.itemId");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (status === "Served") {
      const tableOrders = await Order.find({
        tableId: order.tableId,
        status: { $ne: "Served" },
      });

      if (tableOrders.length === 0) {
        await Table.findByIdAndUpdate(order.tableId, {
          status: "Waiting for Bill",
        });

        const io = getIO();
        io.emit("tableStatusUpdate", {
          tableId: order.tableId,
          status: "Waiting for Bill",
        });
      }
    }

    const io = getIO();
    io.emit("orderStatusUpdate", order);

    res.json(order);
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getOrdersBySession = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId, sessionId } = req.params;

    const orders = await Order.find({ tableId, sessionId })
      .populate("tableId")
      .populate("items.itemId")
      .populate("waiterId", "name")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error("Get orders by session error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const printOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate("tableId")
      .populate("items.itemId")
      .populate("waiterId", "name");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    await printOrder(order);
    res.json({ message: "Order printed successfully" });
  } catch (error) {
    console.error("Print order by ID error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const printOrder = async (order: any) => {
  const printContent = generatePrintContent(order);

  // Here you would integrate with your actual printer
  // For now, we'll just log the content
  console.log("=".repeat(40));
  console.log("ORDER PRINT");
  console.log("=".repeat(40));
  console.log(printContent);
  console.log("=".repeat(40));

  // You can integrate with thermal printer libraries like 'node-thermal-printer'
  // or send to a print service
};

const generatePrintContent = (order: any): string => {
  const now = new Date();
  const orderTime = new Date(order.createdAt);

  let content = `
RESTAURANT ORDER
================
Order #: ${order.orderNumber}
Table: ${order.tableId?.number || "N/A"}
Waiter: ${order.waiterId?.name || "N/A"}
Order Time: ${orderTime.toLocaleString()}
Print Time: ${now.toLocaleString()}

ITEMS:
------`;

  order.items.forEach((item: any, index: number) => {
    content += `
${index + 1}. ${item.itemId?.name || "Unknown Item"}`;
    if (item.selectedVariation) {
      content += ` (${item.selectedVariation})`;
    }
    content += `
   Qty: ${item.quantity}
   Price: रू ${item.totalPrice.toFixed(2)}`;

    if (item.addOns && item.addOns.length > 0) {
      content += `
   Add-ons: ${item.addOns.join(", ")}`;
    }

    if (item.notes) {
      content += `
   Notes: ${item.notes}`;
    }
    content += "\n";
  });

  content += `
------
TOTAL: रू ${order.totalAmount.toFixed(2)}
Status: ${order.status}
================
`;

  return content;
};

export const getActiveOrderForTable = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;

    // Find the most recent non-billed order for this table
    const activeOrder = await Order.findOne({
      tableId,
      isBilled: false,
      status: { $ne: 'Served' } // Not served yet, so items can still be added
    })
      .populate("tableId items.itemId waiterId")
      .sort({ createdAt: -1 });

    if (!activeOrder) {
      return res.status(404).json({ message: "No active order found for this table" });
    }

    res.json(activeOrder);
  } catch (error) {
    console.error("Get active order for table error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addItemsToOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Items are required",
      });
    }

    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Prevent adding items to billed orders
    if (existingOrder.isBilled) {
      return res.status(400).json({
        message: "Cannot add items to billed orders",
      });
    }

    let additionalAmount = 0;

    for (const newItem of items) {
      const menuItem = await MenuItem.findById(newItem.itemId);
      if (!menuItem) {
        return res.status(404).json({
          message: `Menu item ${newItem.itemId} not found`,
        });
      }

      let itemPrice = menuItem.price;

      if (newItem.selectedVariation) {
        const variation = menuItem.variations?.find(
          (v) => v.name === newItem.selectedVariation
        );
        if (variation) {
          itemPrice = variation.price;
        }
      }

      let addOnTotal = 0;
      if (newItem.addOns && Array.isArray(newItem.addOns)) {
        for (const addOnName of newItem.addOns) {
          const addOn = menuItem.addOns?.find((ao) => ao.name === addOnName);
          if (addOn) {
            addOnTotal += addOn.price;
          }
        }
      }

      // Check if this exact item configuration already exists in the order
      const existingItemIndex = existingOrder.items.findIndex(
        (existingItem) =>
          existingItem.itemId.toString() === newItem.itemId &&
          existingItem.selectedVariation === (newItem.selectedVariation || "") &&
          JSON.stringify((existingItem.addOns || []).sort()) === 
          JSON.stringify((newItem.addOns || []).sort()) &&
          existingItem.notes === (newItem.notes || "")
      );

      if (existingItemIndex >= 0) {
        // Update existing item quantity and total
        const existingItem = existingOrder.items[existingItemIndex];
        existingItem.quantity += newItem.quantity;
        existingItem.totalPrice = (itemPrice + addOnTotal) * existingItem.quantity;
        additionalAmount += (itemPrice + addOnTotal) * newItem.quantity;
      } else {
        // Add new item to order
        const totalPrice = (itemPrice + addOnTotal) * newItem.quantity;
        additionalAmount += totalPrice;

        existingOrder.items.push({
          itemId: newItem.itemId,
          quantity: newItem.quantity,
          notes: newItem.notes || "",
          selectedVariation: newItem.selectedVariation || "",
          addOns: newItem.addOns || [],
          itemPrice: itemPrice,
          addOnPrice: addOnTotal,
          totalPrice,
        });
      }
    }

    existingOrder.totalAmount += additionalAmount;

    await existingOrder.save();
    await existingOrder.populate("tableId items.itemId waiterId");

    const io = getIO();
    io.emit("orderUpdated", existingOrder);

    res.json(existingOrder);
  } catch (error) {
    console.error("Add items to order error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
