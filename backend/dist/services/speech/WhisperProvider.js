"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhisperProvider = void 0;
class WhisperProvider {
    async transcribe(audioBuffer, model, apiKey) {
        const startTime = Date.now();
        return {
            text: `[Whisper Speech Mock Transcription using ${model || 'whisper-1'}]: "Sample task description text transcribed."`,
            executionTime: Date.now() - startTime + 520,
        };
    }
}
exports.WhisperProvider = WhisperProvider;
