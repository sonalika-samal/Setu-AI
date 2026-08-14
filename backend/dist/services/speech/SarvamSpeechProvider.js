"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SarvamSpeechProvider = void 0;
const logger_1 = require("../../utils/logger");
class SarvamSpeechProvider {
    async transcribe(audioBuffer, model, apiKey) {
        const startTime = Date.now();
        logger_1.logger.info('SarvamSpeechProvider: Sending audio buffer to Sarvam STT REST API...');
        if (!apiKey) {
            throw new Error('Sarvam API Key (api-subscription-key) is not configured.');
        }
        try {
            const formData = new FormData();
            // Node 18+ Blob representation of binary stream
            const blob = new Blob([audioBuffer], { type: 'audio/ogg' });
            formData.append('file', blob, 'audio.ogg');
            formData.append('model', model || 'saaras:v3');
            const response = await fetch('https://api.sarvam.ai/speech-to-text', {
                method: 'POST',
                headers: {
                    'api-subscription-key': apiKey,
                },
                body: formData,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Sarvam STT API request failed [${response.status}]: ${errorText}`);
            }
            const resData = await response.json();
            const text = resData.transcript || '';
            logger_1.logger.info(`SarvamSpeechProvider: Transcription successful. Text length: ${text.length}`);
            return {
                text,
                executionTime: Date.now() - startTime,
            };
        }
        catch (error) {
            logger_1.logger.error(`SarvamSpeechProvider transcription error: ${error.message}`);
            throw error;
        }
    }
}
exports.SarvamSpeechProvider = SarvamSpeechProvider;
exports.default = SarvamSpeechProvider;
