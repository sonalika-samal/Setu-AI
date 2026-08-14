import { SpeechProvider } from './SpeechProvider';

export class WhisperProvider implements SpeechProvider {
  async transcribe(audioBuffer: Buffer, model: string, apiKey: string): Promise<{ text: string; executionTime: number }> {
    const startTime = Date.now();
    return {
      text: `[Whisper Speech Mock Transcription using ${model || 'whisper-1'}]: "Sample task description text transcribed."`,
      executionTime: Date.now() - startTime + 520,
    };
  }
}
