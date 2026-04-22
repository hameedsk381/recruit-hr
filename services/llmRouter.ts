import { unifiedLiteLlmChat } from '../utils/liteLlmClient';
import { groqChatCompletion } from '../utils/groqClient';
import { PIIManager } from '../utils/pii';

export interface RouteOptions {
  targetProvider?: string; // e.g., 'groq', 'openai', 'anthropic', 'ollama'
  targetModel?: string;    // e.g., 'llama3-8b-8192', 'gpt-4o', 'mistral'
  enforceSovereignty?: boolean; // If true, overrides cloud providers when PII is detected
  fallbackCloudModel?: string;
  fallbackLocalModel?: string;
  temperature?: number;
  max_tokens?: number;
  containsPII?: boolean;
  response_format?: { type: "text" | "json_object" };
}

/**
 * Hybrid LLM Router (LiteLLM-Backed)
 * 
 * Acts as the application-level compliance layer before hitting the LiteLLM Proxy.
 * LiteLLM handles fallbacks, load-balancing, and the OpenAI specification mapping.
 * This router ensures Data Sovereignty / PII requirements are met.
 */
export async function hybridChatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options: RouteOptions = {}
): Promise<string> {
  const {
    containsPII = false,
    enforceSovereignty = true,
    targetProvider,
    targetModel,
    fallbackCloudModel = 'groq-fast',
    fallbackLocalModel = 'local-sovereign', 
    temperature = 0.3,
    max_tokens = 2048,
    response_format
  } = options;

  console.log(`[LLMRouter] Analyzing payload. Contains PII: ${containsPII}`);

  // User requested to only use Groq (bypass LiteLLM and Sovereignty)
  if (process.env.USE_DIRECT_GROQ === 'true') {
    console.log('[LLMRouter] USE_DIRECT_GROQ is active. Routing directly to Groq.');
    return await groqChatCompletion(systemPrompt, userPrompt, temperature, max_tokens, response_format);
  }

  // Construct requested model literal for LiteLLM (e.g., 'openai/gpt-4o' or 'ollama/mistral')
  let resolvedModel = (targetProvider && targetModel) 
    ? `${targetProvider}/${targetModel}` 
    : undefined;

  try {
    if (containsPII && enforceSovereignty) {
      // If the user requested a Cloud provider but the data is sensitive, force local override
      const userRequestedCloud = targetProvider && !['ollama', 'vllm', 'local'].includes(targetProvider.toLowerCase());
      
      if (userRequestedCloud) {
        console.warn(`[LLMRouter] High-Risk Data Detected! Overriding user's cloud choice (${targetProvider}) to maintain GDPR Sovereignty.`);
        resolvedModel = fallbackLocalModel;
      } else {
        // Either they requested a local model, or no model was specified
        resolvedModel = resolvedModel || fallbackLocalModel;
        console.log(`[LLMRouter] High-Risk Data Detected. Utilizing local sovereign model: ${resolvedModel}`);
      }
    } else {
      // Safe Payload or Sovereignty checks disabled
      resolvedModel = resolvedModel || fallbackCloudModel;
      console.log(`[LLMRouter] Payload cleared. Routing to literal LiteLLM destination: ${resolvedModel}`);
    }

    return await unifiedLiteLlmChat(resolvedModel, systemPrompt, userPrompt, temperature, max_tokens, response_format);
  } catch (error) {
    console.error(`[LLMRouter] LiteLLM Proxy Failed. Attempting direct fallback... Error: ${error}`);
    
    // Fallback logic: If proxy fails and it's a groq model or default, try direct Groq
    if (resolvedModel?.includes('groq') || resolvedModel === 'groq-fast') {
      try {
        console.log('[LLMRouter] Triggering direct Groq fallback...');
        return await groqChatCompletion(systemPrompt, userPrompt, temperature, max_tokens, response_format);
      } catch (fallbackError) {
        console.error('[LLMRouter] Direct fallback failed:', fallbackError);
      }
    }
    
    throw new Error(`Hybrid Routing Failed: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

/**
 * Advanced usage: Auto-detects PII and routes automatically.
 */
export async function autoRoutedChatCompletion(
  systemPrompt: string,
  baseText: string,
  options: RouteOptions = {}
): Promise<string> {
  // Deep regex scan for obvious PII (emails, phone numbers, SSNs)
  const isHighRisk = PIIManager.containsPII(baseText);

  // If we can scrub it to make it safe, we do so and let it go to the requested provider.
  if (isHighRisk && !options.containsPII) {
    console.log('[LLMRouter] Auto-detect: Found PII. Attempting proactive scrub before cloud transfer.');
    const scrubbedText = PIIManager.scrubDocumentText(baseText);
    
    // Explicitly safe to hit the cloud via LiteLLM now, respecting user's choice
    const modelTarget = (options.targetProvider && options.targetModel) 
      ? `${options.targetProvider}/${options.targetModel}` 
      : (options.fallbackCloudModel || 'groq/llama-3.1-8b-instant');

    return await unifiedLiteLlmChat(modelTarget, systemPrompt, scrubbedText, options.temperature, options.max_tokens, options.response_format);
  }

  // Otherwise, respect manual overrides and route based on risk
  return await hybridChatCompletion(systemPrompt, baseText, {
    ...options,
    containsPII: isHighRisk || options.containsPII
  });
}
