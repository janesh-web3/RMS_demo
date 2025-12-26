import { Response } from 'express';
import MenuItem from '../models/MenuItem';
import { AuthRequest } from '../middleware/auth';

export const getAllMenuItems = async (req: AuthRequest, res: Response) => {
  try {
    const { category, active } = req.query;
    
    let filter: any = {};
    if (category) filter.category = category;
    if (active !== undefined) filter.isActive = active === 'true';

    const menuItems = await MenuItem.find(filter).sort({ category: 1, name: 1 });
    res.json(menuItems);
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMenuItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const menuItem = await MenuItem.findById(id);
    
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.json(menuItem);
  } catch (error) {
    console.error('Get menu item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createMenuItem = async (req: AuthRequest, res: Response) => {
  try {
    const { name, price, category, variations, addOns, description } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ 
        message: 'Name, price, and category are required' 
      });
    }

    const menuItem = new MenuItem({
      name,
      price,
      category,
      variations: variations || [],
      addOns: addOns || [],
      description,
      isActive: true
    });

    await menuItem.save();
    res.status(201).json(menuItem);
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateMenuItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const menuItem = await MenuItem.findByIdAndUpdate(
      id, 
      updates, 
      { new: true, runValidators: true }
    );

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.json(menuItem);
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteMenuItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const menuItem = await MenuItem.findByIdAndDelete(id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};