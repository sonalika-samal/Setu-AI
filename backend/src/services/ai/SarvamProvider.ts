import { AIProvider } from './AIProvider';
import { logger } from '../../utils/logger';

export class SarvamProvider implements AIProvider {
  async generateText(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    apiKey: string
  ): Promise<{ text: string; executionTime: number }> {
    const startTime = Date.now();
    logger.info('SarvamProvider: Sending prompts to Sarvam Chat Completions API...');

    if (!apiKey) {
      throw new Error('Sarvam API Key (api-subscription-key) is not configured.');
    }

    try {
      const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'api-subscription-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'sarvam-105b',
          temperature: 0,
          max_tokens: 4096,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sarvam LLM API request failed [${response.status}]: ${errorText}`);
      }

      const resData = await response.json() as any;
      const text = resData.choices?.[0]?.message?.content || '';

      logger.info(`SarvamProvider completions successful. Length: ${text.length}`);

      return {
        text,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error(`SarvamProvider execution error: ${(error as Error).message}`);
      throw error;
    }
  }
}
export default SarvamProvider;
