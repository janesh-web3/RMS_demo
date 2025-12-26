"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const http_1 = require("http");
const database_1 = __importDefault(require("./config/database"));
const socket_1 = require("./utils/socket");
const auth_1 = __importDefault(require("./routes/auth"));
const tables_1 = __importDefault(require("./routes/tables"));
const menu_1 = __importDefault(require("./routes/menu"));
const orders_1 = __importDefault(require("./routes/orders"));
const bills_1 = __importDefault(require("./routes/bills"));
const reports_1 = __importDefault(require("./routes/reports"));
const print_1 = __importDefault(require("./routes/print"));
const customers_1 = __importDefault(require("./routes/customers"));
const expenses_1 = __importDefault(require("./routes/expenses"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const settings_1 = __importDefault(require("./routes/settings"));
const test_1 = __importDefault(require("./routes/test"));
const stocks_1 = __importDefault(require("./routes/stocks"));
const suppliers_1 = __importDefault(require("./routes/suppliers"));
const notificationService_1 = require("./services/notificationService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 8080;
(0, socket_1.initializeSocket)(server);
// Security middleware
if (process.env.NODE_ENV === 'production') {
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false, // Disable CSP for Socket.IO compatibility
        crossOriginEmbedderPolicy: false,
    }));
}
// Compression middleware
app.use((0, compression_1.default)());
// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS ?
    process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()) :
    [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "https://roots.crownagi.com",
        "https://www.roots.crownagi.com"
    ];
console.log('🔧 CORS Origins configured:', corsOrigins);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (corsOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            console.warn('❌ CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cache-Control',
        'X-File-Name'
    ],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
    maxAge: 86400, // 24 hours
}));
// Handle preflight requests for all routes
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    res.sendStatus(200);
});
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/api/auth', auth_1.default);
app.use('/api/tables', tables_1.default);
app.use('/api/menu', menu_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/bills', bills_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/print', print_1.default);
app.use('/api/customers', customers_1.default);
app.use('/api/expenses', expenses_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/test', test_1.default);
app.use('/api/stocks', stocks_1.default);
app.use('/api/suppliers', suppliers_1.default);
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Restaurant Management System API is running',
        timestamp: new Date().toISOString()
    });
});
// Test endpoint to trigger notifications
app.post('/api/test-notification', async (req, res) => {
    try {
        const { type = 'order' } = req.body;
        if (type === 'order') {
            await notificationService_1.notificationService.notifyOrderCreated({
                orderNumber: `TEST-${Date.now()}`,
                _id: 'test-order-id',
                tableNumber: '1',
                status: 'Pending',
                totalAmount: 25.99
            });
        }
        else if (type === 'bill') {
            await notificationService_1.notificationService.notifyBillCreated({
                billNumber: `BILL-${Date.now()}`,
                _id: 'test-bill-id',
                tableNumber: '1',
                totalAmount: 25.99
            });
        }
        res.json({
            status: 'OK',
            message: `Test ${type} notification sent`,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Test notification error:', error);
        res.status(500).json({ error: 'Failed to send test notification' });
    }
});
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Restaurant Management System is running',
        timestamp: new Date().toISOString()
    });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});
// Global error handler
app.use((error, req, res, next) => {
    // Log error details
    console.error('❌ Unhandled error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    // Handle different error types
    let statusCode = error.statusCode || error.status || 500;
    let message = 'Internal server error';
    // Mongoose validation errors
    if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation error';
    }
    // Mongoose cast errors (invalid ObjectId)
    if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
    }
    // Mongoose duplicate key errors
    if (error.code === 11000) {
        statusCode = 409;
        message = 'Duplicate entry';
    }
    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }
    if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }
    res.status(statusCode).json({
        message,
        ...(process.env.NODE_ENV === 'development' && {
            error: error.message,
            stack: error.stack
        })
    });
});
const startServer = async () => {
    try {
        await (0, database_1.default)();
        const serverInstance = server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 API available at http://localhost:${PORT}/api`);
            console.log(`🔌 Socket.IO running on http://localhost:${PORT}`);
            console.log(`🛡️ Security: ${process.env.NODE_ENV === 'production' ? 'Production mode' : 'Development mode'}`);
        });
        // Graceful shutdown
        const gracefulShutdown = (signal) => {
            console.log(`\n⚠️ Received ${signal}. Graceful shutdown initiated...`);
            serverInstance.close(() => {
                console.log('✅ HTTP server closed.');
                // Close database connections
                if (require('mongoose').connection.readyState === 1) {
                    require('mongoose').connection.close(() => {
                        console.log('✅ MongoDB connection closed.');
                        process.exit(0);
                    });
                }
                else {
                    process.exit(0);
                }
            });
            // Force close server after 30s
            setTimeout(() => {
                console.error('❌ Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 30000);
        };
        // Listen for termination signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            process.exit(1);
        });
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
