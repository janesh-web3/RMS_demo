import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentMethod {
  type: 'Cash' | 'E-sewa' | 'Khalti' | 'Bank Transfer' | 'Credit';
  amount: number;
}

export interface IBill extends Document {
  tableId: mongoose.Types.ObjectId;
  orders: mongoose.Types.ObjectId[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethods: IPaymentMethod[];
  billNumber: string;
  customerId?: mongoose.Types.ObjectId;
  creditAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentMethodSchema: Schema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['Cash', 'E-sewa', 'Khalti', 'Bank Transfer', 'Credit']
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  }
});

const BillSchema: Schema = new Schema({
  tableId: {
    type: Schema.Types.ObjectId,
    ref: 'Table',
    required: true
  },
  orders: [{
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethods: [PaymentMethodSchema],
  billNumber: {
    type: String,
    required: true,
    unique: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer'
  },
  creditAmount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

export default mongoose.model<IBill>('Bill', BillSchema);