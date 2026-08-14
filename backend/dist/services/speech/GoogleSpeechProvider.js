"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleSpeechProvider = void 0;
class GoogleSpeechProvider {
    async transcribe(audioBuffer, model, apiKey) {
        const startTime = Date.now();
        return {
            text: `[Google Speech Mock Transcription using ${model || 'default'}]: "Sample task description text transcribed."`,
            executionTime: Date.now() - startTime + 420,
        };
    }
}
exports.GoogleSpeechProvider = GoogleSpeechProvider;
