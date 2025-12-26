"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-management';
        console.log('🔄 Attempting to connect to MongoDB...');
        await mongoose_1.default.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000,
        });
        console.log('✅ MongoDB connected successfully');
    }
    catch (error) {
        console.error('❌ MongoDB connection error:', error);
        console.log('⚠️  Running server without database connection...');
        // Don't exit in development - allow server to run without DB
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
};
exports.default = connectDB;
