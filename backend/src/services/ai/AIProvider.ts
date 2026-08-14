export interface AIProvider {
  /**
   * Generates text response using the selected provider, system prompt, and user prompt.
   * Returns generated text along with execution time in milliseconds.
   */
  generateText(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    apiKey: string
  ): Promise<{ text: string; executionTime: number }>;
}
export default AIProvider;
