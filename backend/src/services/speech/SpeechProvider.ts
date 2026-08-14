export interface SpeechProvider {
  /**
   * Transcribes audio buffer to text.
   */
  transcribe(
    audioBuffer: Buffer,
    model: string,
    apiKey: string
  ): Promise<{ text: string; executionTime: number }>;
}
export default SpeechProvider;
