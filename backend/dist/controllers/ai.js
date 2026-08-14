"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIController = void 0;
const OwnerAIService_1 = require("../services/ai/OwnerAIService");
const ownerAIService = new OwnerAIService_1.OwnerAIService();
class AIController {
    async chat(req, res, next) {
        try {
            const { message, history } = req.body;
            const user = req.user;
            if (!message) {
                res.status(400).json({ message: 'Message is required.' });
                return;
            }
            const reply = await ownerAIService.chat(message, history || [], user?.username || 'system');
            res.status(200).json({ reply });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AIController = AIController;
