import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderItem {
  itemId: mongoose.Types.ObjectId;
  quantity: number;
  notes?: string; // Special notes like "No onion", "Extra spicy"
  selectedVariation?: string; // Selected size/variation like "Large", "Medium"
  addOns?: string[]; // Selected add-ons like "Extra Cheese", "Bacon"
  itemPrice: number; // Price of the item including variation
  addOnPrice: number; // Total price of add-ons
  totalPrice: number; // itemPrice * quantity + addOnPrice * quantity
}

export interface IOrder extends Document {
  tableId: mongoose.Types.ObjectId;
  items: IOrderItem[];
  status: 'Pending' | 'Cooking' | 'Ready' | 'Served';
  orderNumber: string;
  waiterId?: mongoose.Types.ObjectId;
  sessionId?: string;
  totalAmount: number;
  isBilled: boolean;
  billedAt?: Date;
  billId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema: Schema = new Schema({
  itemId: {
    type: Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  notes: {
    type: String,
    trim: true
  },
  selectedVariation: {
    type: String,
    trim: true
  },
  addOns: [{
    type: String,
    trim: true
  }],
  itemPrice: {
    type: Number,
    required: true,
    min: 0
  },
  addOnPrice: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  }
});

const OrderSchema: Schema = new Schema({
  tableId: {
    type: Schema.Types.ObjectId,
    ref: 'Table',
    required: true
  },
  items: [OrderItemSchema],
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Cooking', 'Ready', 'Served'],
    default: 'Pending'
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  waiterId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  sessionId: {
    type: String,
    default: function() {
      return new mongoose.Types.ObjectId().toString();
    }
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
  isBilled: {
    type: Boolean,
    default: false
  },
  billedAt: {
    type: Date
  },
  billId: {
    type: Schema.Types.ObjectId,
    ref: 'Bill'
  }
}, {
  timestamps: true
});

export default mongoose.model<IOrder>('Order', OrderSchema);