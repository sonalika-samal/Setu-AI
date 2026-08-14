"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
class OpenAIProvider {
    async generateText(systemPrompt, userPrompt, model, apiKey) {
        const startTime = Date.now();
        return {
            text: `[OpenAI Mock Response using model ${model || 'gpt-4o'}]: System: ${systemPrompt.substring(0, 30)}... User: ${userPrompt}`,
            executionTime: Date.now() - startTime + 250,
        };
    }
}
exports.OpenAIProvider = OpenAIProvider;
exports.default = OpenAIProvider;
