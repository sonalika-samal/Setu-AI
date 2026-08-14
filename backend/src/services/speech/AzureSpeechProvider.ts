import { SpeechProvider } from './SpeechProvider';

export class AzureSpeechProvider implements SpeechProvider {
  async transcribe(audioBuffer: Buffer, model: string, apiKey: string): Promise<{ text: string; executionTime: number }> {
    const startTime = Date.now();
    return {
      text: `[Azure Speech Mock Transcription using ${model || 'default'}]: "Sample task description text transcribed."`,
      executionTime: Date.now() - startTime + 460,
    };
  }
}
