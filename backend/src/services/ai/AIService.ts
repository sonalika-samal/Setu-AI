import { AILogRepository } from '../../repositories/AILogRepository';
import { CredentialRepository } from '../../repositories/CredentialRepository';
import { AIProvider } from './AIProvider';
import { SarvamProvider } from './SarvamProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { GeminiProvider } from './GeminiProvider';
import { ClaudeProvider } from './ClaudeProvider';
import { logger } from '../../utils/logger';

export class AIService {
  private aiLogRepo = new AILogRepository();
  private credentialRepo = new CredentialRepository();

  private getProvider(providerName: string): AIProvider {
    switch (providerName.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider();
      case 'gemini':
        return new GeminiProvider();
      case 'claude':
        return new ClaudeProvider();
      case 'sarvam':
      default:
        return new SarvamProvider();
    }
  }

  async generate(
    systemPrompt: string,
    userPrompt: string,
    providerName: string,
    model: string
  ): Promise<string> {
    logger.info(`AI Service: Generating text using provider: ${providerName}, model: ${model}`);
    try {
      const creds = await this.credentialRepo.getCredentials();
      
      let apiKey = '';
      if (providerName.toLowerCase() === 'sarvam') {
        apiKey = creds.sarvam.apiKey;
      }

      const provider = this.getProvider(providerName);
      const { text, executionTime } = await provider.generateText(systemPrompt, userPrompt, model, apiKey);

      // Log AI invocation in database
      await this.aiLogRepo.create({
        prompt: `System: ${systemPrompt}\nUser: ${userPrompt}`,
        response: text,
        provider: providerName,
        model,
        execution_time: executionTime,
      });

      return text;
    } catch (err) {
      logger.error(`AI execution failed: ${(err as Error).message}`);
      throw err;
    }
  }
}
export default AIService;
