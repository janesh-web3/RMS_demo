"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const restaurantSettingsSchema = new mongoose_1.default.Schema({
    restaurantName: {
        type: String,
        default: 'Restaurant'
    },
    logo: {
        filename: String,
        path: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    },
    address: {
        type: String,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    },
    taxRate: {
        type: Number,
        default: 0.1
    },
    autoPrintEnabled: {
        type: Boolean,
        default: true
    },
    autoPrintKotForNewItems: {
        type: Boolean,
        default: true
    },
    showKotConfirmation: {
        type: Boolean,
        default: true
    },
    printServerEnabled: {
        type: Boolean,
        default: false
    },
    printServerUrl: {
        type: String,
        default: 'http://localhost:4000'
    },
    kitchenPrinterName: {
        type: String,
        default: 'Kitchen_Printer'
    },
    billPrinterName: {
        type: String,
        default: 'Bill_Printer'
    }
}, {
    timestamps: true
});
exports.default = mongoose_1.default.model('RestaurantSettings', restaurantSettingsSchema);
