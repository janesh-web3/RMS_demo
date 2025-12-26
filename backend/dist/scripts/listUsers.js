"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
dotenv_1.default.config();
const listUsers = async () => {
    try {
        // Connect to MongoDB
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_management');
        console.log('✅ Connected to MongoDB');
        // Fetch all users
        const users = await User_1.default.find({}, 'name email role createdAt').sort({ createdAt: -1 });
        if (users.length === 0) {
            console.log('No users found in database.');
            return;
        }
        console.log('');
        console.log('=== ALL USERS IN DATABASE ===');
        console.log('');
        users.forEach((user, index) => {
            console.log(`${index + 1}. Name: ${user.name}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Created: ${user.createdAt.toDateString()}`);
            console.log('');
        });
        console.log('=== LOGIN INFO ===');
        console.log('Use any of the above email addresses with their respective passwords to login.');
        console.log('If you don\'t know the password for these accounts, you may need to:');
        console.log('1. Ask the person who created them');
        console.log('2. Reset the password in the database');
        console.log('3. Create a new admin user');
    }
    catch (error) {
        console.error('❌ Error fetching users:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        process.exit(0);
    }
};
listUsers();
