"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const StockItem_1 = __importDefault(require("../models/StockItem"));
dotenv_1.default.config();
/**
 * Script to update all existing stock items to have isActive: true
 * Run this if stock items were created before the isActive field was added
 */
async function updateStockItems() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        // Count total stock items
        const totalCount = await StockItem_1.default.countDocuments();
        console.log(`📊 Total stock items in DB: ${totalCount}`);
        // Count items without isActive field or with isActive: false
        const inactiveCount = await StockItem_1.default.countDocuments({
            $or: [
                { isActive: { $exists: false } },
                { isActive: false }
            ]
        });
        console.log(`⚠️ Stock items without isActive=true: ${inactiveCount}`);
        if (inactiveCount === 0) {
            console.log('✅ All stock items already have isActive: true');
            process.exit(0);
        }
        // Update all stock items to have isActive: true
        console.log('🔄 Updating stock items...');
        const result = await StockItem_1.default.updateMany({
            $or: [
                { isActive: { $exists: false } },
                { isActive: false }
            ]
        }, {
            $set: { isActive: true }
        });
        console.log(`✅ Updated ${result.modifiedCount} stock items`);
        // Verify the update
        const activeCount = await StockItem_1.default.countDocuments({ isActive: true });
        console.log(`📊 Stock items with isActive=true: ${activeCount}/${totalCount}`);
        // Display all stock items
        const allStockItems = await StockItem_1.default.find().select('name isActive quantity');
        console.log('\n📦 All stock items:');
        allStockItems.forEach(item => {
            console.log(`  - ${item.name}: isActive=${item.isActive}, quantity=${item.quantity}`);
        });
        console.log('\n✅ Update complete!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error updating stock items:', error);
        process.exit(1);
    }
}
updateStockItems();
