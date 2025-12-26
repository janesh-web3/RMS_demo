"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPrintServerEnabled = isPrintServerEnabled;
exports.checkPrintServerHealth = checkPrintServerHealth;
exports.getAvailablePrinters = getAvailablePrinters;
exports.printKitchenOrderViaServer = printKitchenOrderViaServer;
exports.printBillViaServer = printBillViaServer;
exports.updatePrintServerSettings = updatePrintServerSettings;
const axios_1 = __importDefault(require("axios"));
const RestaurantSettings_1 = __importDefault(require("../models/RestaurantSettings"));
/**
 * Get print server configuration from settings
 * Priority: Environment Variables > Database Settings > Default Values
 */
async function getPrintServerConfig() {
    try {
        let settings = await RestaurantSettings_1.default.findOne();
        if (!settings) {
            console.log('⚠️  No settings found, creating default settings');
            settings = await RestaurantSettings_1.default.create({});
        }
        // Priority order: ENV > Database > Default
        const printServerUrl = process.env.PRINT_SERVER_URL || settings.printServerUrl || 'http://localhost:4000';
        const kitchenPrinterName = process.env.KITCHEN_PRINTER_NAME || settings.kitchenPrinterName || 'Kitchen_Printer';
        const billPrinterName = process.env.BILL_PRINTER_NAME || settings.billPrinterName || 'Bill_Printer';
        console.log(`🖨️  Print Server Config: URL=${printServerUrl}, Kitchen=${kitchenPrinterName}, Bill=${billPrinterName}`);
        return {
            printServerUrl,
            kitchenPrinterName,
            billPrinterName
        };
    }
    catch (error) {
        console.error('❌ Error fetching print server config:', error);
        // Return env vars or defaults if settings fetch fails
        return {
            printServerUrl: process.env.PRINT_SERVER_URL || 'http://localhost:4000',
            kitchenPrinterName: process.env.KITCHEN_PRINTER_NAME || 'Kitchen_Printer',
            billPrinterName: process.env.BILL_PRINTER_NAME || 'Bill_Printer'
        };
    }
}
/**
 * Check if print server is enabled in settings
 * Priority: Environment Variable > Database Setting > Default (false)
 */
async function isPrintServerEnabled() {
    try {
        // Check environment variable first
        if (process.env.PRINT_SERVER_ENABLED !== undefined) {
            const enabled = process.env.PRINT_SERVER_ENABLED === 'true';
            console.log(`🖨️  Print Server Enabled (from ENV): ${enabled}`);
            return enabled;
        }
        // Fall back to database setting
        const settings = await RestaurantSettings_1.default.findOne();
        const enabled = settings?.printServerEnabled ?? false;
        console.log(`🖨️  Print Server Enabled (from DB): ${enabled}`);
        return enabled;
    }
    catch (error) {
        console.error('❌ Error checking print server status:', error);
        return false;
    }
}
/**
 * Check if print server is reachable
 */
async function checkPrintServerHealth(url) {
    try {
        const config = await getPrintServerConfig();
        const printServerUrl = url || config.printServerUrl;
        const response = await axios_1.default.get(`${printServerUrl}/health`, {
            timeout: 5000, // 5 second timeout
            headers: {
                'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning page
                'User-Agent': 'RMS-Backend/1.0'
            }
        });
        return response.status === 200 && response.data.status === 'ok';
    }
    catch (error) {
        const axiosError = error;
        if (axiosError.code === 'ECONNREFUSED') {
            console.error('❌ Print server is not running or unreachable');
        }
        else {
            console.error('❌ Print server health check failed:', axiosError.message);
        }
        return false;
    }
}
/**
 * Get available printers from print server
 */
async function getAvailablePrinters() {
    try {
        const config = await getPrintServerConfig();
        const response = await axios_1.default.get(`${config.printServerUrl}/printers`, {
            timeout: 5000,
            headers: {
                'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning page
                'User-Agent': 'RMS-Backend/1.0'
            }
        });
        if (response.data.success) {
            return response.data.printers || [];
        }
        return [];
    }
    catch (error) {
        console.error('❌ Failed to fetch printers:', error);
        return [];
    }
}
/**
 * Print kitchen order via print server
 */
async function printKitchenOrderViaServer(orderData) {
    try {
        const config = await getPrintServerConfig();
        console.log(`🖨️  Sending kitchen order #${orderData.orderId} to print server...`);
        const response = await axios_1.default.post(`${config.printServerUrl}/print/kitchen-order`, {
            ...orderData,
            printerName: config.kitchenPrinterName
        }, {
            timeout: 10000, // 10 second timeout
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning page
                'User-Agent': 'RMS-Backend/1.0'
            }
        });
        if (response.data.success) {
            console.log(`✅ Kitchen order #${orderData.orderId} printed successfully. Job ID: ${response.data.jobId}`);
            return {
                success: true,
                message: response.data.message,
                jobId: response.data.jobId
            };
        }
        else {
            console.error(`❌ Kitchen order #${orderData.orderId} print failed:`, response.data.error);
            return {
                success: false,
                error: response.data.error || 'Unknown error'
            };
        }
    }
    catch (error) {
        const axiosError = error;
        console.error(`❌ Failed to print kitchen order #${orderData.orderId}:`, axiosError.message);
        if (axiosError.code === 'ECONNREFUSED') {
            return {
                success: false,
                error: 'Print server is not running or unreachable'
            };
        }
        else if (axiosError.code === 'ETIMEDOUT') {
            return {
                success: false,
                error: 'Print server request timed out'
            };
        }
        else {
            return {
                success: false,
                error: axiosError.message || 'Unknown error occurred'
            };
        }
    }
}
/**
 * Print bill via print server
 */
async function printBillViaServer(billData) {
    try {
        const config = await getPrintServerConfig();
        // Get restaurant info from settings if not provided
        let restaurantInfo = billData.restaurantInfo;
        if (!restaurantInfo) {
            const settings = await RestaurantSettings_1.default.findOne();
            if (settings) {
                restaurantInfo = {
                    name: settings.restaurantName || 'Restaurant',
                    address: settings.address || '',
                    phone: settings.phone || ''
                };
            }
        }
        console.log(`🖨️  Sending bill #${billData.billId} to print server...`);
        const response = await axios_1.default.post(`${config.printServerUrl}/print/bill`, {
            ...billData,
            restaurantInfo,
            printerName: config.billPrinterName
        }, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning page
                'User-Agent': 'RMS-Backend/1.0'
            }
        });
        if (response.data.success) {
            console.log(`✅ Bill #${billData.billId} printed successfully. Job ID: ${response.data.jobId}`);
            return {
                success: true,
                message: response.data.message,
                jobId: response.data.jobId
            };
        }
        else {
            console.error(`❌ Bill #${billData.billId} print failed:`, response.data.error);
            return {
                success: false,
                error: response.data.error || 'Unknown error'
            };
        }
    }
    catch (error) {
        const axiosError = error;
        console.error(`❌ Failed to print bill #${billData.billId}:`, axiosError.message);
        if (axiosError.code === 'ECONNREFUSED') {
            return {
                success: false,
                error: 'Print server is not running or unreachable'
            };
        }
        else if (axiosError.code === 'ETIMEDOUT') {
            return {
                success: false,
                error: 'Print server request timed out'
            };
        }
        else {
            return {
                success: false,
                error: axiosError.message || 'Unknown error occurred'
            };
        }
    }
}
/**
 * Update print server settings
 */
async function updatePrintServerSettings(updates) {
    try {
        let settings = await RestaurantSettings_1.default.findOne();
        if (!settings) {
            settings = await RestaurantSettings_1.default.create(updates);
        }
        else {
            Object.assign(settings, updates);
            await settings.save();
        }
        console.log('✅ Print server settings updated successfully');
    }
    catch (error) {
        console.error('❌ Failed to update print server settings:', error);
        throw error;
    }
}
exports.default = {
    isPrintServerEnabled,
    checkPrintServerHealth,
    getAvailablePrinters,
    printKitchenOrderViaServer,
    printBillViaServer,
    updatePrintServerSettings
};
