"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const StockTransactionSchema = new mongoose_1.Schema({
    stockItemId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'StockItem',
        required: [true, 'Stock item is required']
    },
    type: {
        type: String,
        required: [true, 'Transaction type is required'],
        enum: ['inflow', 'outflow', 'adjustment']
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required']
    },
    reason: {
        type: String,
        required: [true, 'Reason is required'],
        enum: [
            'purchase',
            'order_deduction',
            'waste',
            'spoilage',
            'theft',
            'return',
            'manual_adjustment',
            'initial_stock',
            'expired',
            'damaged'
        ]
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required']
    },
    orderId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Order'
    },
    expenseId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Expense'
    },
    costPerUnit: {
        type: Number,
        min: [0, 'Cost cannot be negative']
    },
    totalCost: {
        type: Number,
        min: [0, 'Total cost cannot be negative']
    },
    balanceAfter: {
        type: Number,
        required: [true, 'Balance after transaction is required'],
        min: [0, 'Balance cannot be negative']
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    }
}, {
    timestamps: true,
    versionKey: false
});
// Indexes for performance
StockTransactionSchema.index({ stockItemId: 1, date: -1 });
StockTransactionSchema.index({ type: 1 });
StockTransactionSchema.index({ userId: 1 });
StockTransactionSchema.index({ orderId: 1 });
StockTransactionSchema.index({ expenseId: 1 });
StockTransactionSchema.index({ date: -1 });
exports.default = mongoose_1.default.model('StockTransaction', StockTransactionSchema);
