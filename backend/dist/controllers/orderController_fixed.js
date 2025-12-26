"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatus = void 0;
const Order_1 = __importDefault(require("../models/Order"));
const Table_1 = __importDefault(require("../models/Table"));
const socket_1 = require("../utils/socket");
const notificationService_1 = require("../services/notificationService");
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }
        // Get current order to check current status
        const currentOrder = await Order_1.default.findById(id);
        if (!currentOrder) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Prevent status regression - can't go backwards in the workflow
        const statusOrder = ["Pending", "Cooking", "Ready", "Served"];
        const currentStatusIndex = statusOrder.indexOf(currentOrder.status);
        const newStatusIndex = statusOrder.indexOf(status);
        // Allow only forward progression - no backward status changes allowed for anyone
        if (newStatusIndex < currentStatusIndex) {
            return res.status(400).json({
                message: `Cannot change status from ${currentOrder.status} to ${status}. Status can only progress forward.`,
            });
        }
        // Prevent status change if order is already billed
        if (currentOrder.isBilled) {
            return res.status(400).json({
                message: "Cannot change status of billed orders",
            });
        }
        const updatedOrder = await Order_1.default.findByIdAndUpdate(id, { status }, { new: true }).populate("tableId items.itemId");
        if (!updatedOrder) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Send order status notification
        try {
            await notificationService_1.notificationService.notifyOrderStatusUpdated({
                ...updatedOrder.toObject(),
                tableNumber: updatedOrder.tableId.tableNumber
            });
        }
        catch (notificationError) {
            console.error("Notification error:", notificationError);
        }
        // Emit real-time events using simplified socket service
        console.log('Emitting order status update for:', updatedOrder.orderNumber, 'to status:', status);
        // Get table information for comprehensive updates
        const tableInfo = await Table_1.default.findById(updatedOrder.tableId);
        const socketData = {
            orderId: updatedOrder._id.toString(),
            orderNumber: updatedOrder.orderNumber,
            status: updatedOrder.status,
            tableNumber: tableInfo?.tableNumber || 'Unknown',
            updatedAt: updatedOrder.updatedAt,
            order: updatedOrder.toObject()
        };
        (0, socket_1.emitOrderStatusChange)(socketData);
        if (status === "Served") {
            const tableOrders = await Order_1.default.find({
                tableId: updatedOrder.tableId,
                status: { $ne: "Served" },
            });
            if (tableOrders.length === 0) {
                await Table_1.default.findByIdAndUpdate(updatedOrder.tableId, {
                    status: "Waiting for Bill",
                });
                // Send table status notification
                try {
                    await notificationService_1.notificationService.notifyTableStatusUpdated({
                        tableId: updatedOrder.tableId,
                        tableNumber: updatedOrder.tableId.tableNumber,
                        status: "Waiting for Bill"
                    });
                }
                catch (notificationError) {
                    console.error("Notification error:", notificationError);
                }
                // Table status update handled separately (simplified)
            }
        }
        res.json(updatedOrder);
    }
    catch (error) {
        console.error("Update order status error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.updateOrderStatus = updateOrderStatus;
