import OpenAI from 'openai';

// Initialize the OpenAI client pointing to the local LiteLLM Proxy (Port 4000)
// API Key is required by the SDK but LiteLLM handles the actual vendor keys based on the model.
const litellmApi = new OpenAI({
    apiKey: process.env.LITELLM_MASTER_KEY || "sk-litellm-placeholder-key",
    baseURL: process.env.LITELLM_URL || "http://localhost:4000/v1"
});

/**
 * Unified Chat Completion Interface over LiteLLM Proxy
 * 
 * Supports unified fallbacks, caching, and load balancing via LiteLLM configureations.
 * 
 * @param model The LiteLLM model name (e.g., 'groq-fast' or 'local-sovereign')
 * @param system Prompt system instructions
 * @param user User input prompt
 * @param temperature Sampling temperature
 * @param max_tokens Response length limit
 */
export async function unifiedLiteLlmChat(
    model: string,
    system: string,
    user: string,
    temperature: number = 0.3,
    max_tokens: number = 2048
): Promise<string> {
    try {
        console.log(`[LiteLLMClient] Routing request to proxy model: ${model}`);
        
        const response = await litellmApi.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: system },
                { role: "user", content: user }
            ],
            temperature: temperature,
            max_tokens: max_tokens
        });

        const content = response.choices[0]?.message?.content || "";
        
        if (content.length === 0) {
            console.warn('[LiteLLMClient] WARNING: Proxy returned an empty response.');
        }

        return content;
    } catch (error) {
        console.error(`[LiteLLMClient] Proxy Routing Failed for model ${model}:`, error);
        throw new Error(`LiteLLM Error: ${error instanceof Error ? error.message : "Proxy Unavailable"}`);
    }
}
