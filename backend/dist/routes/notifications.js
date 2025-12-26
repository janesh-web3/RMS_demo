"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const notificationService_1 = require("../services/notificationService");
const router = express_1.default.Router();
// Get user notifications
router.get('/', auth_1.auth, async (req, res) => {
    try {
        const { limit = '50', offset = '0' } = req.query;
        const userId = req.user._id.toString();
        const notifications = await notificationService_1.notificationService.getUserNotifications(userId, parseInt(limit), parseInt(offset));
        const unreadCount = await notificationService_1.notificationService.getUnreadCount(userId);
        res.json({
            notifications,
            unreadCount,
            total: notifications.length
        });
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
});
// Get unread notification count
router.get('/unread-count', auth_1.auth, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const unreadCount = await notificationService_1.notificationService.getUnreadCount(userId);
        res.json({ unreadCount });
    }
    catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ message: 'Failed to fetch unread count' });
    }
});
// Mark notification as read
router.patch('/:id/read', auth_1.auth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id.toString();
        const notification = await notificationService_1.notificationService.markAsRead(id, userId);
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json(notification);
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Failed to mark notification as read' });
    }
});
// Mark all notifications as read
router.patch('/mark-all-read', auth_1.auth, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        await notificationService_1.notificationService.markAllAsRead(userId);
        res.json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
});
exports.default = router;
