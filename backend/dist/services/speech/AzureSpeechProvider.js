"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureSpeechProvider = void 0;
class AzureSpeechProvider {
    async transcribe(audioBuffer, model, apiKey) {
        const startTime = Date.now();
        return {
            text: `[Azure Speech Mock Transcription using ${model || 'default'}]: "Sample task description text transcribed."`,
            executionTime: Date.now() - startTime + 460,
        };
    }
}
exports.AzureSpeechProvider = AzureSpeechProvider;
