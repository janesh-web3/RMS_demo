"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
const database_1 = __importDefault(require("../config/database"));
dotenv_1.default.config();
const createAdminUser = async () => {
    try {
        await (0, database_1.default)();
        // Check if admin user already exists
        const existingAdmin = await User_1.default.findOne({ email: 'admin@restaurant.com' });
        if (existingAdmin) {
            console.log('❌ Admin user already exists');
            process.exit(0);
        }
        // Create admin user
        const saltRounds = 10;
        const passwordHash = await bcryptjs_1.default.hash('admin123', saltRounds);
        const adminUser = new User_1.default({
            name: 'Admin User',
            email: 'admin@restaurant.com',
            passwordHash,
            role: 'Admin'
        });
        await adminUser.save();
        console.log('✅ Admin user created successfully');
        console.log('📧 Email: admin@restaurant.com');
        console.log('🔑 Password: admin123');
        console.log('⚠️  Please change the password after first login');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error creating admin user:', error);
        process.exit(1);
    }
};
createAdminUser();
