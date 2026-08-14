import { AIProvider } from './AIProvider';

export class GeminiProvider implements AIProvider {
  async generateText(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    apiKey: string
  ): Promise<{ text: string; executionTime: number }> {
    const startTime = Date.now();
    return {
      text: `[Gemini Mock Response using model ${model || 'gemini-1.5-flash'}]: System: ${systemPrompt.substring(0, 30)}... User: ${userPrompt}`,
      executionTime: Date.now() - startTime + 180,
    };
  }
}
export default GeminiProvider;
