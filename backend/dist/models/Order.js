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
const StockUsageItemSchema = new mongoose_1.Schema({
    stockItemId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'StockItem',
        required: true
    },
    quantityUsed: {
        type: Number,
        required: true,
        min: 0
    },
    unit: {
        type: String,
        required: true
    },
    costPerUnit: {
        type: Number,
        required: true,
        min: 0
    },
    deductionType: {
        type: String,
        enum: ['manual', 'automatic'],
        required: true
    }
});
const OrderItemSchema = new mongoose_1.Schema({
    itemId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
    },
    status: {
        type: String,
        required: true,
        enum: ['active', 'cancelled'],
        default: 'active'
    },
    cancelledAt: {
        type: Date
    },
    cancellationReason: {
        type: String,
        trim: true
    },
    stockItemsUsed: [StockUsageItemSchema],
    meatUsed: {
        type: Number,
        min: 0
    },
    kotPrinted: {
        type: Boolean,
        default: false
    },
    kotPrintedAt: {
        type: Date
    },
    kotPrintCount: {
        type: Number,
        default: 0,
        min: 0
    }
});
const OrderSchema = new mongoose_1.Schema({
    tableId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Table',
        required: true
    },
    items: [OrderItemSchema],
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Cooking', 'Ready', 'Served', 'Merged', 'Cancelled'],
        default: 'Pending'
    },
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },
    waiterId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    sessionId: {
        type: String,
        default: function () {
            return new mongoose_1.default.Types.ObjectId().toString();
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
    isPrinted: {
        type: Boolean,
        default: false
    },
    printedAt: {
        type: Date
    },
    billId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Bill'
    },
    printCount: {
        type: Number,
        default: 0,
        min: 0
    },
    isMerged: {
        type: Boolean,
        default: false
    },
    mergedInto: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Order'
    },
    mergedFrom: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Order'
        }],
    mergedOrderNumbers: [{
            type: String
        }],
    mergedTables: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Table'
        }],
    isCancelled: {
        type: Boolean,
        default: false
    },
    cancelledAt: {
        type: Date
    },
    cancellationReason: {
        type: String,
        trim: true
    },
    cancelledBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});
exports.default = mongoose_1.default.model('Order', OrderSchema);
