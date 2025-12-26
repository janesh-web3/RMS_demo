"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLogo = exports.getLogo = exports.uploadLogo = exports.updateSettings = exports.getSettings = void 0;
const RestaurantSettings_1 = __importDefault(require("../models/RestaurantSettings"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const getSettings = async (req, res) => {
    try {
        let settings = await RestaurantSettings_1.default.findOne();
        if (!settings) {
            settings = new RestaurantSettings_1.default();
            await settings.save();
        }
        res.json(settings);
    }
    catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getSettings = getSettings;
const updateSettings = async (req, res) => {
    try {
        const { restaurantName, address, phone, taxRate, autoPrintEnabled, printServerEnabled, printServerUrl, kitchenPrinterName, billPrinterName } = req.body;
        let settings = await RestaurantSettings_1.default.findOne();
        if (!settings) {
            settings = new RestaurantSettings_1.default();
        }
        if (restaurantName !== undefined)
            settings.restaurantName = restaurantName;
        if (address !== undefined)
            settings.address = address;
        if (phone !== undefined)
            settings.phone = phone;
        if (taxRate !== undefined)
            settings.taxRate = taxRate;
        if (autoPrintEnabled !== undefined)
            settings.autoPrintEnabled = autoPrintEnabled;
        // Print Server Settings
        if (printServerEnabled !== undefined)
            settings.printServerEnabled = printServerEnabled;
        if (printServerUrl !== undefined)
            settings.printServerUrl = printServerUrl;
        if (kitchenPrinterName !== undefined)
            settings.kitchenPrinterName = kitchenPrinterName;
        if (billPrinterName !== undefined)
            settings.billPrinterName = billPrinterName;
        await settings.save();
        res.json({ message: 'Settings updated successfully', settings });
    }
    catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateSettings = updateSettings;
const uploadLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No logo file provided' });
        }
        let settings = await RestaurantSettings_1.default.findOne();
        if (!settings) {
            settings = new RestaurantSettings_1.default();
        }
        // Remove old logo if exists
        if (settings.logo?.path && fs_1.default.existsSync(settings.logo.path)) {
            try {
                fs_1.default.unlinkSync(settings.logo.path);
            }
            catch (unlinkError) {
                console.warn('Failed to remove old logo:', unlinkError);
            }
        }
        // Save new logo info
        settings.logo = {
            filename: req.file.filename,
            path: req.file.path,
            uploadedAt: new Date()
        };
        await settings.save();
        res.json({
            message: 'Logo uploaded successfully',
            logo: {
                filename: settings.logo.filename,
                uploadedAt: settings.logo.uploadedAt
            }
        });
    }
    catch (error) {
        console.error('Upload logo error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.uploadLogo = uploadLogo;
const getLogo = async (req, res) => {
    try {
        const settings = await RestaurantSettings_1.default.findOne();
        if (!settings?.logo?.path || !fs_1.default.existsSync(settings.logo.path)) {
            return res.status(404).json({ message: 'Logo not found' });
        }
        res.sendFile(path_1.default.resolve(settings.logo.path));
    }
    catch (error) {
        console.error('Get logo error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getLogo = getLogo;
const deleteLogo = async (req, res) => {
    try {
        const settings = await RestaurantSettings_1.default.findOne();
        if (!settings?.logo?.path) {
            return res.status(404).json({ message: 'No logo to delete' });
        }
        // Remove logo file
        if (fs_1.default.existsSync(settings.logo.path)) {
            try {
                fs_1.default.unlinkSync(settings.logo.path);
            }
            catch (unlinkError) {
                console.warn('Failed to remove logo file:', unlinkError);
            }
        }
        // Clear logo from settings
        settings.logo = undefined;
        await settings.save();
        res.json({ message: 'Logo deleted successfully' });
    }
    catch (error) {
        console.error('Delete logo error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteLogo = deleteLogo;
