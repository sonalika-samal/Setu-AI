import { AILogRepository } from '../../repositories/AILogRepository';
import { CredentialRepository } from '../../repositories/CredentialRepository';
import { SpeechProvider } from './SpeechProvider';
import { SarvamSpeechProvider } from './SarvamSpeechProvider';
import { WhisperProvider } from './WhisperProvider';
import { GoogleSpeechProvider } from './GoogleSpeechProvider';
import { AzureSpeechProvider } from './AzureSpeechProvider';
import { logger } from '../../utils/logger';

export class SpeechService {
  private aiLogRepo = new AILogRepository();
  private credentialRepo = new CredentialRepository();

  private getProvider(providerName: string): SpeechProvider {
    switch (providerName.toLowerCase()) {
      case 'whisper':
        return new WhisperProvider();
      case 'googlespeech':
      case 'google':
        return new GoogleSpeechProvider();
      case 'azurespeech':
      case 'azure':
        return new AzureSpeechProvider();
      case 'sarvam':
      default:
        return new SarvamSpeechProvider();
    }
  }

  async transcribeAudio(audioBuffer: Buffer, providerName: string, model: string): Promise<string> {
    logger.info(`Speech Service: Transcribing audio using provider: ${providerName}, model: ${model}`);
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
    } catch (err) {
      logger.error(`Speech transcription failed: ${(err as Error).message}`);
      throw err;
    }
  }
}
export default SpeechService;
