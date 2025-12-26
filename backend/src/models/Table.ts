import mongoose, { Document, Schema } from 'mongoose';

export interface ITable extends Document {
  tableNumber: string;
  status: 'Available' | 'Occupied' | 'Waiting for Bill';
  createdAt: Date;
  updatedAt: Date;
}

const TableSchema: Schema = new Schema({
  tableNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Available', 'Occupied', 'Waiting for Bill'],
    default: 'Available'
  }
}, {
  timestamps: true
});

export default mongoose.model<ITable>('Table', TableSchema);