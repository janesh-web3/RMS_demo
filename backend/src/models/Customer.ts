import mongoose, { Document, Schema } from 'mongoose';

export interface ICreditTransaction {
  type: 'Credit' | 'Payment';
  amount: number;
  billId?: mongoose.Types.ObjectId;
  description?: string;
  createdAt: Date;
}

export interface ICustomer extends Document {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditBalance: number;
  totalCreditGiven: number;
  totalCreditPaid: number;
  creditTransactions: ICreditTransaction[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CreditTransactionSchema: Schema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['Credit', 'Payment']
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  billId: {
    type: Schema.Types.ObjectId,
    ref: 'Bill'
  },
  description: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const CustomerSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    sparse: true,
    unique: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
    unique: true
  },
  address: {
    type: String,
    trim: true
  },
  creditBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCreditGiven: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCreditPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  creditTransactions: [CreditTransactionSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
CustomerSchema.index({ name: 1 });
CustomerSchema.index({ phone: 1 });
CustomerSchema.index({ creditBalance: -1 });
CustomerSchema.index({ isActive: 1 });

export default mongoose.model<ICustomer>('Customer', CustomerSchema);