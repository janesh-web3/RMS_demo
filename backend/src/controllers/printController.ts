import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { printKitchenOrder, printBill } from '../utils/printer';
import Order from '../models/Order';
import Bill from '../models/Bill';

export const printKitchen = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    const order = await Order.findById(orderId)
      .populate('tableId')
      .populate('items.itemId');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderData = {
      orderNumber: order.orderNumber,
      tableNumber: (order.tableId as any).tableNumber,
      items: order.items.map(item => ({
        quantity: item.quantity,
        name: (item.itemId as any).name,
        selectedVariation: item.selectedVariation,
        addOns: item.addOns,
        notes: item.notes
      }))
    };

    const success = await printKitchenOrder(orderData);

    if (success) {
      res.json({ message: 'Kitchen order printed successfully' });
    } else {
      res.status(500).json({ message: 'Failed to print kitchen order' });
    }
  } catch (error) {
    console.error('Print kitchen error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const printBillReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const { billId } = req.body;

    if (!billId) {
      return res.status(400).json({ message: 'Bill ID is required' });
    }

    const bill = await Bill.findById(billId)
      .populate('tableId')
      .populate({
        path: 'orders',
        populate: {
          path: 'items.itemId'
        }
      });

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    const billData = {
      billNumber: bill.billNumber,
      tableNumber: (bill.tableId as any).tableNumber,
      createdAt: bill.createdAt,
      orders: bill.orders,
      subtotal: bill.subtotal,
      tax: bill.tax,
      discount: bill.discount,
      total: bill.total,
      paymentMethods: bill.paymentMethods
    };

    const success = await printBill(billData);

    if (success) {
      res.json({ message: 'Bill printed successfully' });
    } else {
      res.status(500).json({ message: 'Failed to print bill' });
    }
  } catch (error) {
    console.error('Print bill error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};