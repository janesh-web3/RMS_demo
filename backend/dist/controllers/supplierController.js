"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSupplier = exports.updateSupplier = exports.createSupplier = exports.getSupplierById = exports.getSuppliers = void 0;
const Supplier_1 = __importDefault(require("../models/Supplier"));
/**
 * Get all suppliers
 */
const getSuppliers = async (req, res) => {
    try {
        console.log('📋 Fetching suppliers with params:', req.query);
        const { page = 1, limit = 50, search = '', isActive = 'true' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const query = {};
        if (isActive !== 'all') {
            query.isActive = isActive === 'true';
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { contact: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        const suppliers = await Supplier_1.default.find(query)
            .sort({ name: 1 })
            .skip(skip)
            .limit(limitNum);
        const total = await Supplier_1.default.countDocuments(query);
        console.log(`✅ Found ${suppliers.length} suppliers`);
        res.json({
            suppliers,
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(total / limitNum),
                totalItems: total,
                itemsPerPage: limitNum
            }
        });
    }
    catch (error) {
        console.error('❌ Get suppliers error:', error.message);
        console.error('Error details:', error);
        res.status(500).json({ message: 'Failed to fetch suppliers', error: error.message });
    }
};
exports.getSuppliers = getSuppliers;
/**
 * Get supplier by ID
 */
const getSupplierById = async (req, res) => {
    try {
        const { id } = req.params;
        const supplier = await Supplier_1.default.findById(id);
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }
        res.json(supplier);
    }
    catch (error) {
        console.error('Get supplier error:', error);
        res.status(500).json({ message: 'Failed to fetch supplier', error: error.message });
    }
};
exports.getSupplierById = getSupplierById;
/**
 * Create new supplier
 */
const createSupplier = async (req, res) => {
    try {
        console.log('📝 Creating supplier with data:', req.body);
        const supplier = new Supplier_1.default(req.body);
        await supplier.save();
        console.log('✅ Supplier created successfully:', supplier.name);
        res.status(201).json({
            message: 'Supplier created successfully',
            supplier
        });
    }
    catch (error) {
        console.error('❌ Create supplier error:', error.message);
        console.error('Error details:', error);
        res.status(400).json({ message: 'Failed to create supplier', error: error.message });
    }
};
exports.createSupplier = createSupplier;
/**
 * Update supplier
 */
const updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const supplier = await Supplier_1.default.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true
        });
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }
        res.json({
            message: 'Supplier updated successfully',
            supplier
        });
    }
    catch (error) {
        console.error('Update supplier error:', error);
        res.status(400).json({ message: 'Failed to update supplier', error: error.message });
    }
};
exports.updateSupplier = updateSupplier;
/**
 * Delete supplier (soft delete)
 */
const deleteSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const supplier = await Supplier_1.default.findByIdAndUpdate(id, { isActive: false }, { new: true });
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }
        res.json({
            message: 'Supplier deleted successfully',
            supplier
        });
    }
    catch (error) {
        console.error('Delete supplier error:', error);
        res.status(500).json({ message: 'Failed to delete supplier', error: error.message });
    }
};
exports.deleteSupplier = deleteSupplier;
