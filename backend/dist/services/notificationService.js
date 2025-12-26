"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const User_1 = __importDefault(require("../models/User"));
const socket_1 = require("../utils/socket");
class NotificationService {
    // Create notification for specific users
    async createNotification(userId, notificationData) {
        const notification = new Notification_1.default({
            userId,
            ...notificationData
        });
        await notification.save();
        return notification;
    }
    // Create notifications for multiple users based on roles
    async createNotificationsForRoles(roles, notificationData) {
        const users = await User_1.default.find({ role: { $in: roles } }).select('_id role');
        const notifications = [];
        for (const user of users) {
            const notification = await this.createNotification(user._id.toString(), notificationData);
            notifications.push(notification);
        }
        return notifications;
    }
    // Order-related notifications
    async notifyOrderCreated(orderData) {
        const notificationData = {
            type: 'order',
            title: 'New Order Created',
            message: `Order #${orderData.orderNumber || orderData._id} has been created for table ${orderData.tableNumber}`,
            data: orderData
        };
        // Create notifications for relevant roles
        await this.createNotificationsForRoles(['admin', 'kitchen', 'waiter'], notificationData);
        // Emit real-time notification
        (0, socket_1.emitOrderNotification)('orderCreated', {
            ...notificationData,
            timestamp: new Date()
        });
    }
    async notifyOrderStatusUpdated(orderData) {
        const statusMessages = {
            pending: 'is pending preparation',
            cooking: 'is being prepared in the kitchen',
            ready: 'is ready for serving',
            served: 'has been served',
            cancelled: 'has been cancelled'
        };
        const notificationData = {
            type: 'order',
            title: 'Order Status Updated',
            message: `Order #${orderData.orderNumber || orderData._id} ${statusMessages[orderData.status] || 'status has been updated'}`,
            data: orderData
        };
        await this.createNotificationsForRoles(['admin', 'kitchen', 'waiter'], notificationData);
        (0, socket_1.emitOrderNotification)('orderStatusUpdated', {
            ...notificationData,
            timestamp: new Date()
        });
    }
    // Bill-related notifications
    async notifyBillCreated(billData) {
        const notificationData = {
            type: 'billing',
            title: 'New Bill Generated',
            message: `Bill #${billData.billNumber || billData._id} has been generated for table ${billData.tableNumber}`,
            data: billData
        };
        await this.createNotificationsForRoles(['admin', 'cashier', 'waiter'], notificationData);
        (0, socket_1.emitBillNotification)('billCreated', {
            ...notificationData,
            timestamp: new Date()
        });
    }
    async notifyBillStatusUpdated(billData) {
        const statusMessages = {
            pending: 'is pending payment',
            paid: 'has been paid',
            cancelled: 'has been cancelled'
        };
        const notificationData = {
            type: 'billing',
            title: 'Bill Status Updated',
            message: `Bill #${billData.billNumber || billData._id} ${statusMessages[billData.status] || 'status has been updated'}`,
            data: billData
        };
        await this.createNotificationsForRoles(['admin', 'cashier'], notificationData);
        (0, socket_1.emitBillNotification)('billStatusUpdated', {
            ...notificationData,
            timestamp: new Date()
        });
    }
    // Table-related notifications
    async notifyTableStatusUpdated(tableData) {
        const statusMessages = {
            free: 'is now available',
            occupied: 'is now occupied',
            reserved: 'is now reserved',
            cleaning: 'is being cleaned'
        };
        const notificationData = {
            type: 'table',
            title: 'Table Status Updated',
            message: `Table ${tableData.tableNumber} ${statusMessages[tableData.status] || 'status has been updated'}`,
            data: tableData
        };
        await this.createNotificationsForRoles(['admin', 'waiter'], notificationData);
        (0, socket_1.emitTableNotification)('tableStatusUpdated', {
            ...notificationData,
            timestamp: new Date()
        });
    }
    // Get notifications for a user
    async getUserNotifications(userId, limit = 50, offset = 0) {
        return await Notification_1.default.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(offset)
            .exec();
    }
    // Get unread notification count for a user
    async getUnreadCount(userId) {
        return await Notification_1.default.countDocuments({ userId, isRead: false });
    }
    // Mark notification as read
    async markAsRead(notificationId, userId) {
        return await Notification_1.default.findOneAndUpdate({ _id: notificationId, userId }, { isRead: true, readAt: new Date() }, { new: true });
    }
    // Mark all notifications as read for a user
    async markAllAsRead(userId) {
        await Notification_1.default.updateMany({ userId, isRead: false }, { isRead: true, readAt: new Date() });
    }
    // Delete old notifications (cleanup)
    async deleteOldNotifications(daysOld = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        await Notification_1.default.deleteMany({
            createdAt: { $lt: cutoffDate },
            isRead: true
        });
    }
}
exports.notificationService = new NotificationService();
exports.default = NotificationService;
