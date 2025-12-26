import { Response } from 'express';
import Table from '../models/Table';
import { AuthRequest } from '../middleware/auth';

export const getAllTables = async (req: AuthRequest, res: Response) => {
  try {
    const tables = await Table.find({}).sort({ tableNumber: 1 });
    res.json(tables);
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createTable = async (req: AuthRequest, res: Response) => {
  try {
    const { tableNumber } = req.body;

    if (!tableNumber) {
      return res.status(400).json({ message: 'Table number is required' });
    }

    const existingTable = await Table.findOne({ tableNumber });
    if (existingTable) {
      return res.status(400).json({ message: 'Table with this number already exists' });
    }

    const table = new Table({ tableNumber });
    await table.save();

    res.status(201).json(table);
  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateTable = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { tableNumber, status } = req.body;

    const table = await Table.findById(id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    if (tableNumber) {
      const existingTable = await Table.findOne({ 
        tableNumber, 
        _id: { $ne: id } 
      });
      if (existingTable) {
        return res.status(400).json({ message: 'Table with this number already exists' });
      }
      table.tableNumber = tableNumber;
    }

    if (status) {
      table.status = status;
    }

    await table.save();
    res.json(table);
  } catch (error) {
    console.error('Update table error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteTable = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const table = await Table.findById(id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    await Table.findByIdAndDelete(id);
    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Delete table error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};