"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeProvider = void 0;
class ClaudeProvider {
    async generateText(systemPrompt, userPrompt, model, apiKey) {
        const startTime = Date.now();
        return {
            text: `[Claude Mock Response using model ${model || 'claude-3-5-sonnet'}]: System: ${systemPrompt.substring(0, 30)}... User: ${userPrompt}`,
            executionTime: Date.now() - startTime + 310,
        };
    }
}
exports.ClaudeProvider = ClaudeProvider;
exports.default = ClaudeProvider;
