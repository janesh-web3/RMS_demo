import { Request, Response } from 'express';
import Customer, { ICustomer, ICreditTransaction } from '../models/Customer';
import Bill from '../models/Bill';
import mongoose from 'mongoose';

// Get all customers with optional filters
export const getCustomers = async (req: Request, res: Response) => {
  try {
    const { 
      search, 
      hasCredit, 
      limit = 50, 
      offset = 0,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const query: any = { isActive: true };

    // Search by name, phone, or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by credit balance
    if (hasCredit === 'true') {
      query.creditBalance = { $gt: 0 };
    } else if (hasCredit === 'false') {
      query.creditBalance = 0;
    }

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const customers = await Customer.find(query)
      .sort(sortOptions)
      .limit(Number(limit))
      .skip(Number(offset))
      .lean();

    const totalCount = await Customer.countDocuments(query);

    res.json({
      customers,
      totalCount,
      hasMore: Number(offset) + customers.length < totalCount
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

// Get customer by ID with credit history
export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    const customer = await Customer.findById(id).lean();

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get recent bills for this customer
    const recentBills = await Bill.find({ customerId: id })
      .populate('tableId', 'tableNumber')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      ...customer,
      recentBills
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
};

// Create new customer
export const createCustomer = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, address } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    // Check for duplicate phone or email only if they are provided
    if (phone || email) {
      const duplicateConditions = [];
      if (phone && phone.trim()) duplicateConditions.push({ phone: phone.trim() });
      if (email && email.trim()) duplicateConditions.push({ email: email.trim() });

      if (duplicateConditions.length > 0) {
        const existingCustomer = await Customer.findOne({
          $or: duplicateConditions,
          isActive: true
        });

        if (existingCustomer) {
          const duplicateField = existingCustomer.phone === phone?.trim() ? 'phone' : 'email';
          return res.status(400).json({ 
            error: `Customer with this ${duplicateField} already exists` 
          });
        }
      }
    }

    const customer = new Customer({
      name: name.trim(),
      phone: phone?.trim() || undefined,
      email: email?.trim() || undefined,
      address: address?.trim() || undefined
    });

    await customer.save();

    res.status(201).json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    if (error instanceof Error && error.message.includes('duplicate key')) {
      res.status(400).json({ error: 'Customer with this phone or email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create customer' });
    }
  }
};

// Update customer
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    // Check for duplicate phone or email only if they are provided (excluding current customer)
    if (phone || email) {
      const duplicateConditions = [];
      if (phone && phone.trim()) duplicateConditions.push({ phone: phone.trim() });
      if (email && email.trim()) duplicateConditions.push({ email: email.trim() });

      if (duplicateConditions.length > 0) {
        const existingCustomer = await Customer.findOne({
          _id: { $ne: id },
          $or: duplicateConditions,
          isActive: true
        });

        if (existingCustomer) {
          const duplicateField = existingCustomer.phone === phone?.trim() ? 'phone' : 'email';
          return res.status(400).json({ 
            error: `Another customer with this ${duplicateField} already exists` 
          });
        }
      }
    }

    const customer = await Customer.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        phone: phone?.trim() || undefined,
        email: email?.trim() || undefined,
        address: address?.trim() || undefined
      },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    if (error instanceof Error && error.message.includes('duplicate key')) {
      res.status(400).json({ error: 'Customer with this phone or email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update customer' });
    }
  }
};

// Soft delete customer
export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if customer has outstanding credit
    if (customer.creditBalance > 0) {
      return res.status(400).json({ 
        error: `Cannot delete customer with outstanding credit balance of रू ${customer.creditBalance.toFixed(2)}` 
      });
    }

    // Soft delete
    customer.isActive = false;
    await customer.save();

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};

// Add credit payment
export const addCreditPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than 0' });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (amount > customer.creditBalance) {
      return res.status(400).json({ 
        error: `Payment amount (रू ${amount.toFixed(2)}) cannot exceed credit balance (रू ${customer.creditBalance.toFixed(2)})` 
      });
    }

    // Add payment transaction
    const transaction: ICreditTransaction = {
      type: 'Payment',
      amount,
      description: description || 'Credit payment',
      createdAt: new Date()
    };

    customer.creditTransactions.push(transaction);
    customer.creditBalance -= amount;
    customer.totalCreditPaid += amount;

    await customer.save();

    res.json({
      message: 'Credit payment recorded successfully',
      customer,
      newBalance: customer.creditBalance
    });
  } catch (error) {
    console.error('Error adding credit payment:', error);
    res.status(500).json({ error: 'Failed to record credit payment' });
  }
};

// Get credit history for a customer
export const getCreditHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    const customer = await Customer.findById(id).lean();

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get paginated credit transactions
    const transactions = customer.creditTransactions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(Number(offset), Number(offset) + Number(limit));

    // Get bills associated with credit transactions
    const billIds = transactions
      .filter(t => t.billId)
      .map(t => t.billId);

    const bills = await Bill.find({ _id: { $in: billIds } })
      .populate('tableId', 'tableNumber')
      .lean();

    const billsMap = bills.reduce((acc, bill) => {
      acc[bill._id.toString()] = bill;
      return acc;
    }, {} as any);

    const enrichedTransactions = transactions.map(transaction => ({
      ...transaction,
      bill: transaction.billId ? billsMap[transaction.billId.toString()] : null
    }));

    res.json({
      customer: {
        _id: customer._id,
        name: customer.name,
        creditBalance: customer.creditBalance,
        totalCreditGiven: customer.totalCreditGiven,
        totalCreditPaid: customer.totalCreditPaid
      },
      transactions: enrichedTransactions,
      totalTransactions: customer.creditTransactions.length,
      hasMore: Number(offset) + transactions.length < customer.creditTransactions.length
    });
  } catch (error) {
    console.error('Error fetching credit history:', error);
    res.status(500).json({ error: 'Failed to fetch credit history' });
  }
};

// Get customers with outstanding credit
export const getCustomersWithCredit = async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const customers = await Customer.find({
      creditBalance: { $gt: 0 },
      isActive: true
    })
    .sort({ creditBalance: -1 })
    .limit(Number(limit))
    .lean();

    const totalOutstanding = customers.reduce((sum, customer) => sum + customer.creditBalance, 0);

    res.json({
      customers,
      totalOutstanding,
      count: customers.length
    });
  } catch (error) {
    console.error('Error fetching customers with credit:', error);
    res.status(500).json({ error: 'Failed to fetch customers with credit' });
  }
};