import { SpeechProvider } from './SpeechProvider';

export class GoogleSpeechProvider implements SpeechProvider {
  async transcribe(audioBuffer: Buffer, model: string, apiKey: string): Promise<{ text: string; executionTime: number }> {
    const startTime = Date.now();
    return {
      text: `[Google Speech Mock Transcription using ${model || 'default'}]: "Sample task description text transcribed."`,
      executionTime: Date.now() - startTime + 420,
    };
  }
}
