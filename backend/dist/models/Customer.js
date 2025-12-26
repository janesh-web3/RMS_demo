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
const CreditTransactionSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Bill'
    },
    description: {
        type: String,
        trim: true
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Bank Transfer', 'Khalti', 'E-sewa'],
        required: function () {
            return this.type === 'Payment';
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
const CustomerSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true,
        sparse: true,
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
// Note: phone already has sparse index from schema definition
CustomerSchema.index({ creditBalance: -1 });
CustomerSchema.index({ isActive: 1 });
exports.default = mongoose_1.default.model('Customer', CustomerSchema);
