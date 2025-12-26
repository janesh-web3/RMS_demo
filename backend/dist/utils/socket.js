"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitPrintNotification = exports.emitNotification = exports.emitBillNotification = exports.emitTableNotification = exports.emitOrderNotification = exports.emitNewBill = exports.emitNewOrder = exports.emitOrderStatusChange = exports.getIO = exports.initializeSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
let io;
const initializeSocket = (server) => {
    console.log('🔌 Initializing Socket.IO server...');
    io = new socket_io_1.Server(server, {
        cors: {
            origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "https://roots.crownagi.com"],
            methods: ["GET", "POST"],
            credentials: true
        },
        allowEIO3: true,
        transports: ['websocket', 'polling']
    });
    // Simplified authentication - allow all connections for now
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            console.log(`🔐 Socket ${socket.id} connecting with token: ${token ? 'YES' : 'NO'}`);
            if (token) {
                try {
                    const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                    const user = await User_1.default.findById(decoded.userId).select('-passwordHash');
                    if (user) {
                        socket.userId = user._id.toString();
                        socket.userRole = user.role;
                        console.log(`✅ Socket ${socket.id} authenticated as ${user.role}`);
                    }
                }
                catch (authError) {
                    console.log(`⚠️ Socket ${socket.id} auth failed, allowing as guest`);
                    socket.userId = 'guest';
                    socket.userRole = 'guest';
                }
            }
            else {
                socket.userId = 'guest';
                socket.userRole = 'guest';
            }
            next();
        }
        catch (error) {
            console.error(`❌ Socket auth error:`, error);
            socket.userId = 'guest';
            socket.userRole = 'guest';
            next();
        }
    });
    io.on('connection', (socket) => {
        console.log(`🔗 Client connected: ${socket.id} (${socket.userRole})`);
        // Join a general room for all users
        socket.join('orders-room');
        console.log(`👥 Socket ${socket.id} joined orders-room`);
        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
        });
    });
    console.log('✅ Socket.IO server initialized successfully');
    return io;
};
exports.initializeSocket = initializeSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
exports.getIO = getIO;
// Simple function to emit order status changes
const emitOrderStatusChange = (orderData) => {
    if (!io) {
        console.log('❌ Socket IO not initialized');
        return;
    }
    console.log('🚀 Emitting order status change:', {
        orderId: orderData.orderId,
        orderNumber: orderData.orderNumber,
        status: orderData.status
    });
    // Emit to all clients in the orders room
    io.to('orders-room').emit('orderStatusChanged', orderData);
    // Also emit globally as backup
    io.emit('orderStatusChanged', orderData);
    console.log('✅ Order status change emitted successfully');
};
exports.emitOrderStatusChange = emitOrderStatusChange;
// Emit event for new order creation with dynamic print data
const emitNewOrder = (orderData) => {
    if (!io) {
        console.log('❌ Socket IO not initialized');
        return;
    }
    console.log('🚀 Emitting new order event for auto-print:', {
        orderId: orderData.orderId,
        orderNumber: orderData.orderNumber
    });
    // Emit to all clients in the orders room for auto-printing
    io.to('orders-room').emit('newOrder', orderData);
    // Also emit globally as backup
    io.emit('newOrder', orderData);
    console.log('✅ New order event emitted successfully for auto-print');
};
exports.emitNewOrder = emitNewOrder;
// Emit event for new bill creation with dynamic print data
const emitNewBill = (billData) => {
    if (!io) {
        console.log('❌ Socket IO not initialized');
        return;
    }
    console.log('🚀 Emitting new bill event for auto-print:', {
        billId: billData.billId,
        billNumber: billData.billNumber
    });
    // Emit to all clients in the orders room for auto-printing
    io.to('orders-room').emit('billCreated', billData);
    // Also emit globally as backup
    io.emit('billCreated', billData);
    console.log('✅ New bill event emitted successfully for auto-print');
};
exports.emitNewBill = emitNewBill;
// Legacy compatibility functions - now properly emit events
const emitOrderNotification = (event, data) => {
    if (!io) {
        console.log('❌ Socket IO not initialized for emitOrderNotification');
        return;
    }
    console.log(`🚀 Emitting order notification "${event}":`, data);
    io.emit(event, data);
    console.log(`✅ Order notification "${event}" emitted successfully`);
};
exports.emitOrderNotification = emitOrderNotification;
const emitTableNotification = (event, data) => {
    if (!io) {
        console.log('❌ Socket IO not initialized for emitTableNotification');
        return;
    }
    console.log(`🚀 Emitting table notification "${event}":`, data);
    io.emit(event, data);
    console.log(`✅ Table notification "${event}" emitted successfully`);
};
exports.emitTableNotification = emitTableNotification;
const emitBillNotification = (event, data) => {
    if (!io) {
        console.log('❌ Socket IO not initialized for emitBillNotification');
        return;
    }
    console.log(`🚀 Emitting bill notification "${event}":`, data);
    io.emit(event, data);
    console.log(`✅ Bill notification "${event}" emitted successfully`);
};
exports.emitBillNotification = emitBillNotification;
const emitNotification = (event, data) => {
    if (!io) {
        console.log('❌ Socket IO not initialized for emitNotification');
        return;
    }
    console.log(`🚀 Emitting notification "${event}":`, data);
    io.emit(event, data);
    console.log(`✅ Notification "${event}" emitted successfully`);
};
exports.emitNotification = emitNotification;
const emitPrintNotification = (event, data) => {
    if (!io) {
        console.log('❌ Socket IO not initialized for emitPrintNotification');
        return;
    }
    console.log(`🚀 Emitting print notification "${event}":`, data);
    io.emit(event, data);
    console.log(`✅ Print notification "${event}" emitted successfully`);
};
exports.emitPrintNotification = emitPrintNotification;
