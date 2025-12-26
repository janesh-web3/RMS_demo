"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printBill = exports.printKitchenOrder = exports.printKOTForNewItems = exports.printToWindowsPrinter = exports.createPrinter = void 0;
const node_thermal_printer_1 = require("node-thermal-printer");
const child_process_1 = require("child_process");
const util_1 = require("util");
const RestaurantSettings_1 = __importDefault(require("../models/RestaurantSettings"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const createPrinter = (config) => {
    return new node_thermal_printer_1.ThermalPrinter({
        type: config.type === 'ethernet' ? node_thermal_printer_1.PrinterTypes.EPSON : node_thermal_printer_1.PrinterTypes.EPSON,
        interface: config.interface,
        characterSet: config.characterSet || node_thermal_printer_1.CharacterSet.PC852_LATIN2,
        removeSpecialCharacters: config.removeSpecialCharacters || false,
        lineCharacter: config.lineCharacter || "-",
        width: config.width || 42, // Default to 42 characters for 12cm paper
    });
};
exports.createPrinter = createPrinter;
// Alternative printing method for Windows dot-matrix printers like EPSON LQ-50
const printToWindowsPrinter = async (printerName, content) => {
    try {
        // Create a temporary file with the content
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const tempFile = path.join(os.tmpdir(), `print_${Date.now()}.txt`);
        fs.writeFileSync(tempFile, content, 'utf8');
        // Use PowerShell Out-Printer command (more reliable than print command)
        const command = `powershell "Get-Content '${tempFile}' | Out-Printer -Name '${printerName}'"`;
        await execAsync(command);
        // Clean up temp file
        fs.unlinkSync(tempFile);
        console.log(`Successfully printed to ${printerName}`);
        return true;
    }
    catch (error) {
        console.error('Windows printer error:', error);
        return false;
    }
};
exports.printToWindowsPrinter = printToWindowsPrinter;
// Calculate dynamic height based on content for 12cm paper
const calculateDynamicHeight = (contentLines) => {
    // Base height for header/footer + content lines
    // Each line is approximately 24 dots high (standard for 80mm paper)
    // For 12cm paper, we adjust based on actual content
    const lineHeight = 24; // dots per line
    const baseHeight = 3 * lineHeight; // Header + footer spacing
    const contentHeight = contentLines * lineHeight;
    return baseHeight + contentHeight;
};
/**
 * Print KOT for newly added items to an existing order
 * Includes "ADDITIONAL ITEMS" label to distinguish from original order
 */
const printKOTForNewItems = async (orderData, isAdditionalItems = false) => {
    try {
        // Get restaurant settings
        const restaurantSettings = await RestaurantSettings_1.default.findOne();
        // Enhanced printer interface detection for Windows
        let printerInterface = process.env.PRINTER_INTERFACE || 'usb';
        // For Windows USB printers, use specific printer name if provided
        if (process.platform === 'win32') {
            if (printerInterface === 'usb') {
                printerInterface = 'printer'; // fallback to default
            }
            console.log(`Windows detected: Using printer interface: "${printerInterface}"`);
            // Check if this is an EPSON LQ series (dot-matrix) printer
            if (printerInterface.includes('LQ-')) {
                console.log('Detected EPSON LQ series dot-matrix printer, using Windows print command');
                // Create formatted text content for dot-matrix printing
                let content = '';
                // Restaurant header with aggressive side margins
                if (restaurantSettings?.restaurantName) {
                    const nameLength = restaurantSettings.restaurantName.length;
                    const maxWidth = 42; // Optimized for 12cm paper width (42 characters)
                    const padding = Math.max(0, Math.floor((maxWidth - nameLength) / 2));
                    content += ' '.repeat(padding) + restaurantSettings.restaurantName.toUpperCase() + '\n';
                }
                if (restaurantSettings?.address) {
                    const addressLength = restaurantSettings.address.length;
                    const maxWidth = 42;
                    const padding = Math.max(0, Math.floor((maxWidth - addressLength) / 2));
                    content += ' '.repeat(padding) + restaurantSettings.address + '\n';
                }
                if (restaurantSettings?.phone) {
                    const phoneLength = restaurantSettings.phone.length;
                    const maxWidth = 42;
                    const padding = Math.max(0, Math.floor((maxWidth - phoneLength) / 2));
                    content += ' '.repeat(padding) + restaurantSettings.phone + '\n';
                }
                content += '='.repeat(42) + '\n';
                content += '    KITCHEN ORDER\n';
                if (isAdditionalItems) {
                    content += '  ** ADDITIONAL ITEMS **\n';
                }
                content += '='.repeat(42) + '\n';
                content += `Table: ${orderData.tableNumber}\n`;
                content += `Order: ${orderData.orderNumber}\n`;
                content += `Time: ${new Date().toLocaleString()}\n`;
                if (isAdditionalItems) {
                    content += `Added to existing order\n`;
                }
                content += '-'.repeat(42) + '\n';
                let contentLines = isAdditionalItems ? 10 : 8; // Base lines for header info
                for (const item of orderData.items) {
                    content += `${item.quantity}x ${item.name}\n`;
                    contentLines += 1;
                    if (item.selectedVariation) {
                        content += `  → ${item.selectedVariation}\n`;
                        contentLines++;
                    }
                    if (item.addOns && item.addOns.length > 0) {
                        content += `  → + ${item.addOns.join(', ')}\n`;
                        contentLines++;
                    }
                    if (item.notes) {
                        content += `  Notes: ${item.notes}\n`;
                        contentLines++;
                    }
                }
                content += '-'.repeat(42) + '\n';
                content += 'END OF ORDER\n';
                content += '='.repeat(42) + '\n\n';
                contentLines += 3;
                console.log(`Calculated dynamic content height: ${calculateDynamicHeight(contentLines)} dots`);
                return await (0, exports.printToWindowsPrinter)(printerInterface, content);
            }
        }
        // For thermal printers, use dynamic height calculation
        const printerConfig = {
            type: process.env.PRINTER_TYPE === 'ethernet' ? 'ethernet' : 'usb',
            interface: printerInterface,
            width: 42 // 12cm paper width in characters
        };
        const printer = (0, exports.createPrinter)(printerConfig);
        // Calculate content lines for dynamic height
        let contentLines = isAdditionalItems ? 10 : 8; // Base lines for header
        printer.alignCenter();
        printer.setTextSize(1, 1);
        printer.bold(true);
        printer.println("=== KITCHEN ORDER ===");
        if (isAdditionalItems) {
            printer.setTextSize(0, 1);
            printer.println("** ADDITIONAL ITEMS **");
            printer.setTextSize(1, 1);
        }
        printer.bold(false);
        printer.newLine();
        contentLines += isAdditionalItems ? 4 : 3;
        printer.alignLeft();
        printer.setTextSize(1, 1);
        printer.println(`Table: ${orderData.tableNumber}`);
        printer.println(`Order: ${orderData.orderNumber}`);
        printer.println(`Time: ${new Date().toLocaleString()}`);
        if (isAdditionalItems) {
            printer.setTextSize(0, 1);
            printer.println(`Added to existing order`);
            printer.setTextSize(1, 1);
            contentLines++;
        }
        printer.drawLine();
        contentLines += 4;
        for (const item of orderData.items) {
            printer.setTextSize(1, 1);
            printer.bold(true);
            printer.println(`${item.quantity}x ${item.name}`);
            printer.bold(false);
            printer.setTextSize(0, 1);
            contentLines += 2;
            if (item.selectedVariation) {
                printer.println(`   Variation: ${item.selectedVariation}`);
                contentLines++;
            }
            if (item.addOns && item.addOns.length > 0) {
                printer.println(`   Add-ons: ${item.addOns.join(', ')}`);
                contentLines++;
            }
            if (item.notes) {
                printer.println(`   Notes: ${item.notes}`);
                contentLines++;
            }
            printer.newLine();
            contentLines++;
        }
        printer.drawLine();
        printer.alignCenter();
        printer.println("End of Order");
        printer.cut();
        contentLines += 3;
        console.log(`Calculated dynamic content height: ${calculateDynamicHeight(contentLines)} dots`);
        await printer.execute();
        console.log(`Kitchen order printed successfully ${isAdditionalItems ? '(ADDITIONAL ITEMS)' : ''} with dynamic length`);
        return true;
    }
    catch (error) {
        console.error('Kitchen printer error:', error);
        return false;
    }
};
exports.printKOTForNewItems = printKOTForNewItems;
const printKitchenOrder = async (orderData) => {
    try {
        // Get restaurant settings
        const restaurantSettings = await RestaurantSettings_1.default.findOne();
        // Enhanced printer interface detection for Windows
        let printerInterface = process.env.PRINTER_INTERFACE || 'usb';
        // For Windows USB printers, use specific printer name if provided
        if (process.platform === 'win32') {
            if (printerInterface === 'usb') {
                printerInterface = 'printer'; // fallback to default
            }
            console.log(`Windows detected: Using printer interface: "${printerInterface}"`);
            // Check if this is an EPSON LQ series (dot-matrix) printer
            if (printerInterface.includes('LQ-')) {
                console.log('Detected EPSON LQ series dot-matrix printer, using Windows print command');
                // Create formatted text content for dot-matrix printing
                let content = '';
                // Restaurant header with aggressive side margins
                if (restaurantSettings?.restaurantName) {
                    const nameLength = restaurantSettings.restaurantName.length;
                    const maxWidth = 42; // Optimized for 12cm paper width (42 characters)
                    const padding = Math.max(0, Math.floor((maxWidth - nameLength) / 2));
                    content += ' '.repeat(padding) + restaurantSettings.restaurantName.toUpperCase() + '\n';
                }
                if (restaurantSettings?.address) {
                    const addressLength = restaurantSettings.address.length;
                    const maxWidth = 42;
                    const padding = Math.max(0, Math.floor((maxWidth - addressLength) / 2));
                    content += ' '.repeat(padding) + restaurantSettings.address + '\n';
                }
                if (restaurantSettings?.phone) {
                    const phoneLength = restaurantSettings.phone.length;
                    const maxWidth = 42;
                    const padding = Math.max(0, Math.floor((maxWidth - phoneLength) / 2));
                    content += ' '.repeat(padding) + restaurantSettings.phone + '\n';
                }
                content += '='.repeat(42) + '\n';
                content += '    KITCHEN ORDER\n';
                content += '='.repeat(42) + '\n';
                content += `Table: ${orderData.tableNumber}\n`;
                content += `Order: ${orderData.orderNumber}\n`;
                content += `Time: ${new Date().toLocaleString()}\n`;
                content += '-'.repeat(42) + '\n';
                let contentLines = 8; // Base lines for header info
                for (const item of orderData.items) {
                    content += `${item.quantity}x ${item.name}\n`;
                    contentLines += 1;
                    if (item.selectedVariation) {
                        content += `  → ${item.selectedVariation}\n`;
                        contentLines++;
                    }
                    if (item.addOns && item.addOns.length > 0) {
                        content += `  → + ${item.addOns.join(', ')}\n`;
                        contentLines++;
                    }
                    if (item.notes) {
                        content += `  Notes: ${item.notes}\n`;
                        contentLines++;
                    }
                }
                content += '-'.repeat(42) + '\n';
                content += 'END OF ORDER\n';
                content += '='.repeat(42) + '\n\n';
                contentLines += 3;
                console.log(`Calculated dynamic content height: ${calculateDynamicHeight(contentLines)} dots`);
                return await (0, exports.printToWindowsPrinter)(printerInterface, content);
            }
        }
        // For thermal printers, use dynamic height calculation
        const printerConfig = {
            type: process.env.PRINTER_TYPE === 'ethernet' ? 'ethernet' : 'usb',
            interface: printerInterface,
            width: 42 // 12cm paper width in characters
        };
        const printer = (0, exports.createPrinter)(printerConfig);
        // Calculate content lines for dynamic height
        let contentLines = 8; // Base lines for header
        printer.alignCenter();
        printer.setTextSize(1, 1);
        printer.bold(true);
        printer.println("=== KITCHEN ORDER ===");
        printer.bold(false);
        printer.newLine();
        contentLines += 3;
        printer.alignLeft();
        printer.setTextSize(1, 1);
        printer.println(`Table: ${orderData.tableNumber}`);
        printer.println(`Order: ${orderData.orderNumber}`);
        printer.println(`Time: ${new Date().toLocaleString()}`);
        printer.drawLine();
        contentLines += 4;
        for (const item of orderData.items) {
            printer.setTextSize(1, 1);
            printer.bold(true);
            printer.println(`${item.quantity}x ${item.name}`);
            printer.bold(false);
            printer.setTextSize(0, 1);
            contentLines += 2;
            if (item.selectedVariation) {
                printer.println(`   Variation: ${item.selectedVariation}`);
                contentLines++;
            }
            if (item.addOns && item.addOns.length > 0) {
                printer.println(`   Add-ons: ${item.addOns.join(', ')}`);
                contentLines++;
            }
            if (item.notes) {
                printer.println(`   Notes: ${item.notes}`);
                contentLines++;
            }
            printer.newLine();
            contentLines++;
        }
        printer.drawLine();
        printer.alignCenter();
        printer.println("End of Order");
        printer.cut();
        contentLines += 3;
        console.log(`Calculated dynamic content height: ${calculateDynamicHeight(contentLines)} dots`);
        await printer.execute();
        console.log('Kitchen order printed successfully with dynamic length');
        return true;
    }
    catch (error) {
        console.error('Kitchen printer error:', error);
        return false;
    }
};
exports.printKitchenOrder = printKitchenOrder;
const printBill = async (billData, logoPath, cutPaper = true) => {
    try {
        // Get restaurant settings
        const restaurantSettings = await RestaurantSettings_1.default.findOne();
        // Enhanced printer interface detection for Windows
        let printerInterface = process.env.PRINTER_INTERFACE || 'usb';
        // For Windows USB printers, use specific printer name if provided
        if (process.platform === 'win32') {
            if (printerInterface === 'usb') {
                printerInterface = 'printer'; // fallback to default
            }
            console.log(`Windows detected: Using printer interface for bill: "${printerInterface}"`);
            // Check if this is an EPSON LQ series (dot-matrix) printer
            if (printerInterface.includes('LQ-')) {
                console.log('Detected EPSON LQ series dot-matrix printer for bill, using Windows print command');
                // Create compact formatted bill content for dot-matrix printing
                let content = '';
                // Compact header - no restaurant name/address/phone to save space
                content += `Bill: ${billData.billNumber} | Table: ${billData.tableNumber}\n`;
                content += `${new Date(billData.createdAt).toLocaleString()}\n`;
                content += '-'.repeat(42) + '\n';
                let contentLines = 3; // Reduced base lines for compact header
                let subtotal = 0;
                for (const order of billData.orders) {
                    for (const item of order.items) {
                        const itemName = item.itemId?.name || item.name || 'Unknown Item';
                        const unitPrice = item.itemPrice || item.price || 0;
                        const addOnPrice = item.addOnPrice || 0;
                        const quantity = item.quantity || 1;
                        const totalPrice = item.totalPrice || (quantity * (unitPrice + addOnPrice));
                        // Compact format: just item and price on one line
                        const maxItemNameLength = 28; // Use more space for item name
                        const truncatedItemName = itemName.length > maxItemNameLength
                            ? itemName.substring(0, maxItemNameLength - 3) + "..."
                            : itemName;
                        const itemLine = `${quantity}x ${truncatedItemName}`;
                        const price = `Rs.${totalPrice.toFixed(2)}`;
                        const spaces = Math.max(1, 42 - itemLine.length - price.length);
                        content += itemLine + ' '.repeat(spaces) + price + '\n';
                        contentLines++;
                        // Skip unit price, variations, addons, and notes for compact format
                        subtotal += totalPrice;
                    }
                }
                content += '-'.repeat(42) + '\n';
                contentLines++;
                const subtotalLine = `Subtotal:`;
                const subtotalPrice = `Rs.${billData.subtotal.toFixed(2)}`;
                let spaces = Math.max(1, 42 - subtotalLine.length - subtotalPrice.length);
                content += subtotalLine + ' '.repeat(Math.max(1, spaces)) + subtotalPrice + '\n';
                contentLines++;
                const taxRate = Math.round((restaurantSettings?.taxRate || 0.0) * 100);
                const taxLine = `Tax (${taxRate}%):`;
                const taxPrice = `Rs.${billData.tax.toFixed(2)}`;
                spaces = Math.max(1, 42 - taxLine.length - taxPrice.length);
                content += taxLine + ' '.repeat(Math.max(1, spaces)) + taxPrice + '\n';
                contentLines++;
                if (billData.discount > 0) {
                    const discountLine = `Discount:`;
                    const discountPrice = `-Rs.${billData.discount.toFixed(2)}`;
                    spaces = Math.max(1, 42 - discountLine.length - discountPrice.length);
                    content += discountLine + ' '.repeat(Math.max(1, spaces)) + discountPrice + '\n';
                    contentLines++;
                }
                content += '-'.repeat(42) + '\n';
                const totalLine = `TOTAL:`;
                const totalPrice = `Rs.${billData.total.toFixed(2)}`;
                spaces = Math.max(1, 42 - totalLine.length - totalPrice.length);
                content += totalLine + ' '.repeat(spaces) + totalPrice + '\n';
                content += `Payment: ${billData.paymentType}\n`;
                content += '-'.repeat(42) + '\n';
                contentLines += 4;
                console.log(`Calculated dynamic content height: ${calculateDynamicHeight(contentLines)} dots`);
                return await (0, exports.printToWindowsPrinter)(printerInterface, content);
            }
        }
        // For thermal printers, use dynamic height calculation
        const printerConfig = {
            type: process.env.PRINTER_TYPE === 'ethernet' ? 'ethernet' : 'usb',
            interface: printerInterface,
            width: 42 // 12cm paper width in characters
        };
        const printer = (0, exports.createPrinter)(printerConfig);
        // Calculate content lines for dynamic height (compact version)
        let contentLines = 5; // Reduced base lines for compact header
        // Skip logo printing for compact format
        // Skip center-aligned header for compact format
        printer.alignLeft();
        printer.setTextSize(1, 1);
        printer.bold(true);
        printer.println(`Bill: ${billData.billNumber} | Table: ${billData.tableNumber}`);
        printer.bold(false);
        printer.println(`${new Date(billData.createdAt).toLocaleString()}`);
        printer.drawLine();
        contentLines += 3;
        let subtotal = 0;
        for (const order of billData.orders) {
            for (const item of order.items) {
                const itemName = item.itemId?.name || item.name || 'Unknown Item';
                const unitPrice = item.itemPrice || item.price || 0;
                const addOnPrice = item.addOnPrice || 0;
                const quantity = item.quantity || 1;
                const totalPrice = item.totalPrice || (quantity * (unitPrice + addOnPrice));
                // Compact format: just item name, quantity, and price on one line
                const itemLine = `${quantity}x ${itemName}`;
                const price = `Rs.${totalPrice.toFixed(2)}`;
                const spaces = 42 - itemLine.length - price.length;
                printer.println(itemLine + ' '.repeat(Math.max(1, spaces)) + price);
                contentLines++;
                // Skip unit price, variations, addons, and notes for compact format
                subtotal += totalPrice;
            }
        }
        printer.drawLine();
        contentLines++;
        // Get settings for tax rate
        const billSettings = await RestaurantSettings_1.default.findOne();
        const subtotalLine = `Subtotal:`;
        const subtotalPrice = `Rs.${billData.subtotal.toFixed(2)}`;
        let spaces = 42 - subtotalLine.length - subtotalPrice.length;
        printer.println(subtotalLine + ' '.repeat(Math.max(1, spaces)) + subtotalPrice);
        contentLines++;
        const taxRate = Math.round((billSettings?.taxRate || 0.0) * 100);
        const taxLine = `Tax (${taxRate}%):`;
        const taxPrice = `Rs.${billData.tax.toFixed(2)}`;
        spaces = 42 - taxLine.length - taxPrice.length;
        printer.println(taxLine + ' '.repeat(Math.max(1, spaces)) + taxPrice);
        contentLines++;
        if (billData.discount > 0) {
            const discountLine = `Discount:`;
            const discountPrice = `-Rs.${billData.discount.toFixed(2)}`;
            spaces = 42 - discountLine.length - discountPrice.length;
            printer.println(discountLine + ' '.repeat(Math.max(1, spaces)) + discountPrice);
            contentLines++;
        }
        printer.drawLine();
        printer.bold(true);
        const totalLine = `TOTAL:`;
        const totalPrice = `Rs.${billData.total.toFixed(2)}`;
        spaces = 42 - totalLine.length - totalPrice.length;
        printer.println(totalLine + ' '.repeat(Math.max(1, spaces)) + totalPrice);
        printer.bold(false);
        printer.println(`Payment: ${billData.paymentType}`);
        printer.drawLine();
        contentLines += 3;
        // Only cut paper if requested (last bill in series or single bill)
        if (cutPaper) {
            printer.cut();
            console.log('Paper cut after bill');
        }
        else {
            // Add small separator between split bills without cutting
            printer.newLine();
            console.log('No paper cut - continuous printing');
        }
        console.log(`Calculated dynamic content height: ${calculateDynamicHeight(contentLines)} dots`);
        await printer.execute();
        console.log('Bill printed successfully with dynamic length');
        return true;
    }
    catch (error) {
        console.error('Bill printer error:', error);
        return false;
    }
};
exports.printBill = printBill;
