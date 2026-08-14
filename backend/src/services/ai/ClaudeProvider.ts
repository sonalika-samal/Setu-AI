import { AIProvider } from './AIProvider';

export class ClaudeProvider implements AIProvider {
  async generateText(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    apiKey: string
  ): Promise<{ text: string; executionTime: number }> {
    const startTime = Date.now();
    return {
      text: `[Claude Mock Response using model ${model || 'claude-3-5-sonnet'}]: System: ${systemPrompt.substring(0, 30)}... User: ${userPrompt}`,
      executionTime: Date.now() - startTime + 310,
    };
  }
}
export default ClaudeProvider;
