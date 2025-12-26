import mongoose, { Document, Schema } from 'mongoose';

export interface IVariation {
  name: string; // e.g., "Small", "Medium", "Large"
  price: number; // Price for this variation
}

export interface IAddOn {
  name: string; // e.g., "Extra Cheese", "No Onion"
  price: number; // Additional cost (can be 0 for free add-ons)
}

export interface IMenuItem extends Document {
  name: string;
  price: number; // Base price (used when no variation selected)
  category: 'Starters' | 'Mains' | 'Desserts' | 'Drinks';
  variations: IVariation[]; // Different sizes/types with their prices
  addOns: IAddOn[]; // Extra items that can be added
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VariationSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
});

const AddOnSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
});

const MenuItemSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['Starters', 'Mains', 'Desserts', 'Drinks']
  },
  variations: [VariationSchema],
  addOns: [AddOnSchema],
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);