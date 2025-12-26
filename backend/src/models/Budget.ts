import mongoose, { Document, Schema } from 'mongoose';

export interface IBudget extends Document {
  category: 'Food Supplies' | 'Beverages' | 'Utilities' | 'Rent' | 'Salaries' | 'Maintenance' | 'Marketing' | 'Other';
  budgetAmount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  year: number;
  month?: number; // For monthly budgets
  quarter?: number; // For quarterly budgets
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema: Schema = new Schema({
  category: {
    type: String,
    required: true,
    enum: ['Food Supplies', 'Beverages', 'Utilities', 'Rent', 'Salaries', 'Maintenance', 'Marketing', 'Other']
  },
  budgetAmount: {
    type: Number,
    required: true,
    min: 0
  },
  period: {
    type: String,
    required: true,
    enum: ['monthly', 'quarterly', 'yearly']
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    min: 1,
    max: 12
  },
  quarter: {
    type: Number,
    min: 1,
    max: 4
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Create compound indexes for unique constraints
BudgetSchema.index({ category: 1, period: 1, year: 1, month: 1, quarter: 1 }, { unique: true });

export default mongoose.model<IBudget>('Budget', BudgetSchema);