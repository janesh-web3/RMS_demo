"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const socket_1 = require("../utils/socket");
const router = (0, express_1.Router)();
// Test endpoint to manually trigger socket events
router.post('/socket-test', (req, res) => {
    try {
        const io = (0, socket_1.getIO)();
        const testData = {
            orderId: 'test-order-123',
            orderNumber: 'TEST-001',
            status: 'Cooking',
            timestamp: new Date().toISOString(),
            message: 'This is a test socket event from /test/socket-test endpoint'
        };
        console.log('🧪 Manual socket test - emitting events...');
        // Emit all the events that the frontend listens for
        io.emit('order-status-changed', testData);
        io.emit('order-updated', { type: 'test', order: testData });
        io.emit('orderStatusUpdated', testData);
        io.emit('orderCreated', testData);
        console.log('✅ Test events emitted successfully');
        res.json({
            success: true,
            message: 'Socket test events emitted',
            data: testData,
            connectedClients: io.engine.clientsCount
        });
    }
    catch (error) {
        console.error('❌ Socket test error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to emit socket events',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get socket connection info
router.get('/socket-info', (req, res) => {
    try {
        const io = (0, socket_1.getIO)();
        res.json({
            success: true,
            connectedClients: io.engine.clientsCount,
            socketId: req.headers['socket-id'] || 'unknown'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get socket info'
        });
    }
});
exports.default = router;
