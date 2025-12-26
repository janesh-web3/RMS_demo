"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUserPassword = exports.updateUser = exports.createUser = exports.getAllUsers = exports.getCurrentUser = exports.register = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', { email, password: password ? '***' : 'undefined' });
        if (!email || !password) {
            console.log('Missing email or password');
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const user = await User_1.default.findOne({ email: email.toLowerCase() });
        console.log('User found:', user ? 'Yes' : 'No');
        if (!user) {
            console.log('User not found for email:', email.toLowerCase());
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        console.log('Comparing password...');
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        console.log('Password valid:', isPasswordValid);
        if (!isPasswordValid) {
            console.log('Password comparison failed');
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.login = login;
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        console.log(req.body);
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }
        const existingUser = await User_1.default.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }
        const saltRounds = 10;
        const passwordHash = await bcryptjs_1.default.hash(password, saltRounds);
        const user = new User_1.default({
            name,
            email: email.toLowerCase(),
            passwordHash,
            role: role || 'Waiter'
        });
        await user.save();
        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.register = register;
const getCurrentUser = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getCurrentUser = getCurrentUser;
const getAllUsers = async (req, res) => {
    try {
        if (req.user?.role !== 'Admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }
        const users = await User_1.default.find().select('-passwordHash');
        const transformedUsers = users.map(user => ({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            notificationSettings: user.notificationSettings,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        }));
        res.json(transformedUsers);
    }
    catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllUsers = getAllUsers;
const createUser = async (req, res) => {
    try {
        if (req.user?.role !== 'Admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }
        const existingUser = await User_1.default.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }
        const saltRounds = 10;
        const passwordHash = await bcryptjs_1.default.hash(password, saltRounds);
        const user = new User_1.default({
            name,
            email: email.toLowerCase(),
            passwordHash,
            role: role || 'Waiter'
        });
        await user.save();
        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
    try {
        if (req.user?.role !== 'Admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }
        const { userId } = req.params;
        const { name, email, role } = req.body;
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (name)
            user.name = name;
        if (email) {
            const existingUser = await User_1.default.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already exists' });
            }
            user.email = email.toLowerCase();
        }
        if (role)
            user.role = role;
        await user.save();
        res.json({
            message: 'User updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateUser = updateUser;
const updateUserPassword = async (req, res) => {
    try {
        if (req.user?.role !== 'Admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }
        const { userId } = req.params;
        const { password } = req.body;
        if (!userId || !password) {
            return res.status(400).json({ message: 'User ID and password are required' });
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const saltRounds = 10;
        const passwordHash = await bcryptjs_1.default.hash(password, saltRounds);
        user.passwordHash = passwordHash;
        await user.save();
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        console.error('Update user password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateUserPassword = updateUserPassword;
const deleteUser = async (req, res) => {
    try {
        if (req.user?.role !== 'Admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role === 'Admin') {
            return res.status(400).json({ message: 'Cannot delete admin user' });
        }
        await User_1.default.findByIdAndDelete(userId);
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteUser = deleteUser;
