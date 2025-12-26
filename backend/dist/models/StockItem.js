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
const StockItemSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Stock item name is required'],
        trim: true,
        maxlength: [100, 'Stock item name cannot exceed 100 characters']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: [
            'vegetables',
            'fruits',
            'meat',
            'seafood',
            'dairy',
            'grains',
            'spices',
            'beverages',
            'oils',
            'condiments',
            'bakery',
            'frozen',
            'other'
        ],
        default: 'other'
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        default: 0,
        min: [0, 'Quantity cannot be negative']
    },
    unit: {
        type: String,
        required: [true, 'Unit is required'],
        enum: ['kg', 'g', 'liter', 'ml', 'pieces', 'packets', 'boxes', 'cans', 'bottles'],
        default: 'kg'
    },
    costPerUnit: {
        type: Number,
        required: [true, 'Cost per unit is required'],
        min: [0, 'Cost cannot be negative'],
        default: 0
    },
    supplierId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Supplier'
    },
    minThreshold: {
        type: Number,
        required: [true, 'Minimum threshold is required'],
        default: 0,
        min: [0, 'Threshold cannot be negative']
    },
    expirationDate: {
        type: Date
    },
    sku: {
        type: String,
        trim: true,
        unique: true,
        sparse: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    deductionType: {
        type: String,
        enum: ['manual', 'automatic'],
        default: 'automatic',
        required: true
    },
    linkedMenuItems: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'MenuItem'
        }]
}, {
    timestamps: true,
    versionKey: false
});
// Indexes for performance optimization
StockItemSchema.index({ name: 1 });
StockItemSchema.index({ category: 1 });
StockItemSchema.index({ quantity: 1 });
StockItemSchema.index({ isActive: 1 });
StockItemSchema.index({ supplierId: 1 });
StockItemSchema.index({ expirationDate: 1 });
// Virtual for stock value
StockItemSchema.virtual('totalValue').get(function () {
    return this.quantity * this.costPerUnit;
});
// Virtual for low stock status
StockItemSchema.virtual('isLowStock').get(function () {
    return this.quantity <= this.minThreshold;
});
// Virtual for expired status
StockItemSchema.virtual('isExpired').get(function () {
    if (!this.expirationDate)
        return false;
    return new Date() > this.expirationDate;
});
// Include virtuals in JSON responses
StockItemSchema.set('toJSON', { virtuals: true });
StockItemSchema.set('toObject', { virtuals: true });
exports.default = mongoose_1.default.model('StockItem', StockItemSchema);
