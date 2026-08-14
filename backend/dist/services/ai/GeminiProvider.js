"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiProvider = void 0;
class GeminiProvider {
    async generateText(systemPrompt, userPrompt, model, apiKey) {
        const startTime = Date.now();
        return {
            text: `[Gemini Mock Response using model ${model || 'gemini-1.5-flash'}]: System: ${systemPrompt.substring(0, 30)}... User: ${userPrompt}`,
            executionTime: Date.now() - startTime + 180,
        };
    }
}
exports.GeminiProvider = GeminiProvider;
exports.default = GeminiProvider;
