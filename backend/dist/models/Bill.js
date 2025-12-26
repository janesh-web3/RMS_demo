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
const PaymentMethodSchema = new mongoose_1.Schema({
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
const SplitItemSchema = new mongoose_1.Schema({
    itemId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: true
    },
    orderItemIndex: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    itemPrice: {
        type: Number,
        required: true,
        min: 0
    },
    addOnPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    }
});
const SplitGuestSchema = new mongoose_1.Schema({
    guestName: {
        type: String
    },
    items: [SplitItemSchema],
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
    }
});
const BillSchema = new mongoose_1.Schema({
    tableId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Table',
        required: true
    },
    orders: [{
            type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    creditAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    isPrinted: {
        type: Boolean,
        default: false
    },
    printedAt: {
        type: Date
    },
    printCount: {
        type: Number,
        default: 0,
        min: 0
    },
    // Split bill fields
    isSplit: {
        type: Boolean,
        default: false
    },
    splitType: {
        type: String,
        enum: ['equal', 'items', 'custom'],
        required: function () { return this.isSplit; }
    },
    parentBillId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Bill'
    },
    splitBills: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Bill'
        }],
    splitGuests: [SplitGuestSchema],
    guestName: {
        type: String
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid', 'partial'],
        default: 'unpaid'
    },
    paidAmount: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});
exports.default = mongoose_1.default.model('Bill', BillSchema);
