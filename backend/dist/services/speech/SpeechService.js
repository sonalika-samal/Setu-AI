"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeechService = void 0;
const AILogRepository_1 = require("../../repositories/AILogRepository");
const CredentialRepository_1 = require("../../repositories/CredentialRepository");
const SarvamSpeechProvider_1 = require("./SarvamSpeechProvider");
const WhisperProvider_1 = require("./WhisperProvider");
const GoogleSpeechProvider_1 = require("./GoogleSpeechProvider");
const AzureSpeechProvider_1 = require("./AzureSpeechProvider");
const logger_1 = require("../../utils/logger");
class SpeechService {
    aiLogRepo = new AILogRepository_1.AILogRepository();
    credentialRepo = new CredentialRepository_1.CredentialRepository();
    getProvider(providerName) {
        switch (providerName.toLowerCase()) {
            case 'whisper':
                return new WhisperProvider_1.WhisperProvider();
            case 'googlespeech':
            case 'google':
                return new GoogleSpeechProvider_1.GoogleSpeechProvider();
            case 'azurespeech':
            case 'azure':
                return new AzureSpeechProvider_1.AzureSpeechProvider();
            case 'sarvam':
            default:
                return new SarvamSpeechProvider_1.SarvamSpeechProvider();
        }
    }
    async transcribeAudio(audioBuffer, providerName, model) {
        logger_1.logger.info(`Speech Service: Transcribing audio using provider: ${providerName}, model: ${model}`);
        try {
            const creds = await this.credentialRepo.getCredentials();
            let apiKey = '';
            if (providerName.toLowerCase() === 'sarvam') {
                apiKey = creds.sarvam.apiKey;
            }
            // Future: add keys for OpenAI Whisper, Google, Azure
            const provider = this.getProvider(providerName);
            const { text, executionTime } = await provider.transcribe(audioBuffer, model, apiKey);
            // Log audio transcription action in AI logs
            await this.aiLogRepo.create({
                prompt: `[Audio Transcription Request: Buffer size ${audioBuffer.length} bytes]`,
                response: text,
                provider: providerName,
                model,
                execution_time: executionTime,
            });
            return text;
        }
        catch (err) {
            logger_1.logger.error(`Speech transcription failed: ${err.message}`);
            throw err;
        }
    }
}
exports.SpeechService = SpeechService;
exports.default = SpeechService;
