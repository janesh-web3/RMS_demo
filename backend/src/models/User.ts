import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'Admin' | 'Waiter' | 'Cashier' | 'Kitchen';
  notificationSettings: {
    soundEnabled: boolean;
    volume: number; // 0-100
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['Admin', 'Waiter', 'Cashier', 'Kitchen'],
    default: 'Waiter'
  },
  notificationSettings: {
    soundEnabled: {
      type: Boolean,
      default: true
    },
    volume: {
      type: Number,
      default: 70,
      min: 0,
      max: 100
    }
  }
}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);