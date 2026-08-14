"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const CredentialRepository_1 = require("../repositories/CredentialRepository");
const logger_1 = require("../utils/logger");
class CredentialService {
    credentialRepo = new CredentialRepository_1.CredentialRepository();
    async getCredentials() {
        return this.credentialRepo.getCredentials();
    }
    async updateCredentials(data) {
        logger_1.logger.info('Updating application credentials.');
        return this.credentialRepo.updateCredentials(data);
    }
    async getDatabaseStatus() {
        const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
        const stateVal = mongoose_1.default.connection.readyState;
        const status = states[stateVal] || 'Unknown';
        return {
            dbName: mongoose_1.default.connection.name || 'n8ndb',
            dbStatus: status,
            connectionStatus: stateVal === 1 ? 'Healthy' : 'Degraded',
        };
    }
}
exports.CredentialService = CredentialService;
