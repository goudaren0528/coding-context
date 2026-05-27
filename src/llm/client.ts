import { resolveLlmConfig } from "../config.js";
import type { ProjectConfig } from "../types.js";

export interface LlmCallOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  projectConfig?: ProjectConfig | null;
}

interface ChatCompletionsResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

function getEndpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/chat/completions`;
}

function getEffectiveConfig(options: LlmCallOptions) {
  const resolved = resolveLlmConfig(options.projectConfig ?? null);
  return {
    ...resolved,
    model: options.model ?? resolved.model,
  };
}

export async function callLlm(
  systemPrompt: string,
  userMessage: string,
  options: LlmCallOptions = {}
): Promise<string> {
  const config = getEffectiveConfig(options);
  if (!config.enabled || !config.model || !config.baseUrl || !config.apiKey) {
    return "";
  }

  const maxTokens = options.maxTokens ?? 1024;

  try {
    const response = await fetch(getEndpoint(config.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        temperature: options.temperature ?? 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json() as ChatCompletionsResponse;
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    console.error(`[ctx] LLM call failed: ${String(err)}`);
    return "";
  }
}

export function isAvailable(projectConfig: ProjectConfig | null = null): boolean {
  const config = resolveLlmConfig(projectConfig);
  return Boolean(config.enabled && config.model && config.baseUrl && config.apiKey);
}
