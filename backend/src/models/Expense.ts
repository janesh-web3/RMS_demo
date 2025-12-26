import mongoose, { Document, Schema } from 'mongoose';

export interface IExpense extends Document {
  date: Date;
  category: 'Food Supplies' | 'Beverages' | 'Utilities' | 'Rent' | 'Salaries' | 'Maintenance' | 'Marketing' | 'Other';
  amount: number;
  paymentMethod: 'Cash' | 'E-sewa' | 'Khalti' | 'Bank Transfer' | 'Credit';
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema: Schema = new Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  category: {
    type: String,
    required: true,
    enum: ['Food Supplies', 'Beverages', 'Utilities', 'Rent', 'Salaries', 'Maintenance', 'Marketing', 'Other']
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['Cash', 'E-sewa', 'Khalti', 'Bank Transfer', 'Credit']
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model<IExpense>('Expense', ExpenseSchema);