"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
dotenv_1.default.config();
const resetPassword = async () => {
    try {
        // Connect to MongoDB
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_management');
        console.log('✅ Connected to MongoDB');
        const email = 'janeshtimilsena963@gmail.com';
        const newPassword = 'admin123';
        // Find the user
        const user = await User_1.default.findOne({ email });
        if (!user) {
            console.log(`❌ User with email ${email} not found.`);
            return;
        }
        // Hash the new password
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
        // Update the password
        await User_1.default.findByIdAndUpdate(user._id, { passwordHash: hashedPassword });
        console.log('🎉 Password reset successfully!');
        console.log('');
        console.log('=== LOGIN CREDENTIALS ===');
        console.log(`Email: ${email}`);
        console.log(`Password: ${newPassword}`);
        console.log(`Role: ${user.role}`);
        console.log('');
        console.log('Use these credentials to login to your frontend.');
    }
    catch (error) {
        console.error('❌ Error resetting password:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        process.exit(0);
    }
};
resetPassword();
