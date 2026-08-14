"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SarvamProvider = void 0;
const logger_1 = require("../../utils/logger");
class SarvamProvider {
    async generateText(systemPrompt, userPrompt, model, apiKey) {
        const startTime = Date.now();
        logger_1.logger.info('SarvamProvider: Sending prompts to Sarvam Chat Completions API...');
        if (!apiKey) {
            throw new Error('Sarvam API Key (api-subscription-key) is not configured.');
        }
        try {
            const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'api-subscription-key': apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model || 'sarvam-105b',
                    temperature: 0,
                    max_tokens: 4096,
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt,
                        },
                        {
                            role: 'user',
                            content: userPrompt,
                        },
                    ],
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Sarvam LLM API request failed [${response.status}]: ${errorText}`);
            }
            const resData = await response.json();
            const text = resData.choices?.[0]?.message?.content || '';
            logger_1.logger.info(`SarvamProvider completions successful. Length: ${text.length}`);
            return {
                text,
                executionTime: Date.now() - startTime,
            };
        }
        catch (error) {
            logger_1.logger.error(`SarvamProvider execution error: ${error.message}`);
            throw error;
        }
    }
}
exports.SarvamProvider = SarvamProvider;
exports.default = SarvamProvider;
