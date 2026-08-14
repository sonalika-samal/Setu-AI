import { SpeechProvider } from './SpeechProvider';
import { logger } from '../../utils/logger';

export class SarvamSpeechProvider implements SpeechProvider {
  async transcribe(audioBuffer: Buffer, model: string, apiKey: string): Promise<{ text: string; executionTime: number }> {
    const startTime = Date.now();
    logger.info('SarvamSpeechProvider: Sending audio buffer to Sarvam STT REST API...');

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

      const resData = await response.json() as any;
      const text = resData.transcript || '';
      
      logger.info(`SarvamSpeechProvider: Transcription successful. Text length: ${text.length}`);

      return {
        text,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error(`SarvamSpeechProvider transcription error: ${(error as Error).message}`);
      throw error;
    }
  }
}
export default SarvamSpeechProvider;
