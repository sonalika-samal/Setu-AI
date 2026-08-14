"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const AILogRepository_1 = require("../../repositories/AILogRepository");
const CredentialRepository_1 = require("../../repositories/CredentialRepository");
const SarvamProvider_1 = require("./SarvamProvider");
const OpenAIProvider_1 = require("./OpenAIProvider");
const GeminiProvider_1 = require("./GeminiProvider");
const ClaudeProvider_1 = require("./ClaudeProvider");
const logger_1 = require("../../utils/logger");
class AIService {
    aiLogRepo = new AILogRepository_1.AILogRepository();
    credentialRepo = new CredentialRepository_1.CredentialRepository();
    getProvider(providerName) {
        switch (providerName.toLowerCase()) {
            case 'openai':
                return new OpenAIProvider_1.OpenAIProvider();
            case 'gemini':
                return new GeminiProvider_1.GeminiProvider();
            case 'claude':
                return new ClaudeProvider_1.ClaudeProvider();
            case 'sarvam':
            default:
                return new SarvamProvider_1.SarvamProvider();
        }
    }
    async generate(systemPrompt, userPrompt, providerName, model) {
        logger_1.logger.info(`AI Service: Generating text using provider: ${providerName}, model: ${model}`);
        try {
            const creds = await this.credentialRepo.getCredentials();
            let apiKey = '';
            if (providerName.toLowerCase() === 'sarvam') {
                apiKey = creds.sarvam.apiKey;
            }
            const provider = this.getProvider(providerName);
            const { text, executionTime } = await provider.generateText(systemPrompt, userPrompt, model, apiKey);
            // Log AI invocation in database
            await this.aiLogRepo.create({
                prompt: `System: ${systemPrompt}\nUser: ${userPrompt}`,
                response: text,
                provider: providerName,
                model,
                execution_time: executionTime,
            });
            return text;
        }
        catch (err) {
            logger_1.logger.error(`AI execution failed: ${err.message}`);
            throw err;
        }
    }
}
exports.AIService = AIService;
exports.default = AIService;
