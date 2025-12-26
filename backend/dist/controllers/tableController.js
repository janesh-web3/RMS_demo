"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTable = exports.updateTable = exports.createTable = exports.getAllTables = void 0;
const Table_1 = __importDefault(require("../models/Table"));
const getAllTables = async (req, res) => {
    try {
        const tables = await Table_1.default.find({}).sort({ tableNumber: 1 });
        res.json(tables);
    }
    catch (error) {
        console.error('Get tables error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllTables = getAllTables;
const createTable = async (req, res) => {
    try {
        const { tableNumber } = req.body;
        if (!tableNumber) {
            return res.status(400).json({ message: 'Table number is required' });
        }
        const existingTable = await Table_1.default.findOne({ tableNumber });
        if (existingTable) {
            return res.status(400).json({ message: 'Table with this number already exists' });
        }
        const table = new Table_1.default({ tableNumber });
        await table.save();
        res.status(201).json(table);
    }
    catch (error) {
        console.error('Create table error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createTable = createTable;
const updateTable = async (req, res) => {
    try {
        const { id } = req.params;
        const { tableNumber, status } = req.body;
        const table = await Table_1.default.findById(id);
        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }
        if (tableNumber) {
            const existingTable = await Table_1.default.findOne({
                tableNumber,
                _id: { $ne: id }
            });
            if (existingTable) {
                return res.status(400).json({ message: 'Table with this number already exists' });
            }
            table.tableNumber = tableNumber;
        }
        if (status) {
            table.status = status;
        }
        await table.save();
        res.json(table);
    }
    catch (error) {
        console.error('Update table error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateTable = updateTable;
const deleteTable = async (req, res) => {
    try {
        const { id } = req.params;
        const table = await Table_1.default.findById(id);
        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }
        await Table_1.default.findByIdAndDelete(id);
        res.json({ message: 'Table deleted successfully' });
    }
    catch (error) {
        console.error('Delete table error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteTable = deleteTable;
