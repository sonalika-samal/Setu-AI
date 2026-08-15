"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.authenticateJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config/config");
const UserRepository_1 = require("../repositories/UserRepository");
const logger_1 = require("../utils/logger");
const userRepo = new UserRepository_1.UserRepository();
const authenticateJWT = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Authorization token required' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        // Verify user still exists in DB
        const userExists = await userRepo.findById(decoded.id);
        if (!userExists) {
            res.status(401).json({ message: 'User no longer exists' });
            return;
        }
        // Check account status
        if (userExists.account_status === 'Disabled') {
            res.status(403).json({ message: 'Access Denied: This account has been disabled.' });
            return;
        }
        // Check token version for Force Logout Session Management
        const tokenVersion = decoded.token_version;
        if (tokenVersion !== undefined && tokenVersion !== userExists.token_version) {
            res.status(401).json({ message: 'Session expired or invalidated. Please sign in again.' });
            return;
        }
        const resolvedOrgId = userExists.orgId || decoded.orgId || 'default';
        req.user = {
            id: decoded.id,
            username: decoded.username,
            role: decoded.role,
            orgId: resolvedOrgId,
        };
        req.orgId = resolvedOrgId;
        next();
    }
    catch (error) {
        logger_1.logger.warn(`JWT verification failed: ${error.message}`);
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};
exports.authenticateJWT = authenticateJWT;
const requireRole = (roles) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const userRoleLower = user.role ? user.role.toLowerCase() : '';
        const rolesLower = roles.map(r => r.toLowerCase());
        if (!rolesLower.includes(userRoleLower)) {
            res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
