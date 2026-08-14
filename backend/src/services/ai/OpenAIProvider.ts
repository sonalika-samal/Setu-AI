import { AIProvider } from './AIProvider';

export class OpenAIProvider implements AIProvider {
  async generateText(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    apiKey: string
  ): Promise<{ text: string; executionTime: number }> {
    const startTime = Date.now();
    return {
      text: `[OpenAI Mock Response using model ${model || 'gpt-4o'}]: System: ${systemPrompt.substring(0, 30)}... User: ${userPrompt}`,
      executionTime: Date.now() - startTime + 250,
    };
  }
}
export default OpenAIProvider;
