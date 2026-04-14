import { unifiedLiteLlmChat } from '../utils/liteLlmClient';
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
    fallbackCloudModel = 'groq/llama-3.1-8b-instant',
    fallbackLocalModel = 'ollama/llama3', 
    temperature = 0.3,
    max_tokens = 2048
  } = options;

  console.log(`[LLMRouter] Analyzing payload. Contains PII: ${containsPII}`);

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

    return await unifiedLiteLlmChat(resolvedModel, systemPrompt, userPrompt, temperature, max_tokens);
  } catch (error) {
    console.error(`[LLMRouter] Error with hybrid route. Error: ${error}`);
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
  // Deep regex scan for obvious PII (emails, phone numbers)
  const isHighRisk = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(baseText);

  // If we can scrub it to make it safe, we do so and let it go to the requested provider.
  if (isHighRisk && !options.containsPII) {
    console.log('[LLMRouter] Auto-detect: Found PII. Attempting proactive scrub before cloud transfer.');
    const scrubbedText = PIIManager.scrubDocumentText(baseText);
    
    // Explicitly safe to hit the cloud via LiteLLM now, respecting user's choice
    const modelTarget = (options.targetProvider && options.targetModel) 
      ? `${options.targetProvider}/${options.targetModel}` 
      : (options.fallbackCloudModel || 'groq/llama-3.1-8b-instant');

    return await unifiedLiteLlmChat(modelTarget, systemPrompt, scrubbedText, options.temperature, options.max_tokens);
  }

  // Otherwise, respect manual overrides and route based on risk
  return await hybridChatCompletion(systemPrompt, baseText, {
    ...options,
    containsPII: isHighRisk || options.containsPII
  });
}
