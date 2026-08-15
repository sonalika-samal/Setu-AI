"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOrgContext = void 0;
const requireOrgContext = (req, res, next) => {
    const orgId = req.user?.orgId || req.orgId;
    if (!orgId) {
        res.status(403).json({ message: 'No organisation context. Please log in again.' });
        return;
    }
    req.orgId = orgId;
    next();
};
exports.requireOrgContext = requireOrgContext;
