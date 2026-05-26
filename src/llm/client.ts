import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey, getCtxModel } from "../config.js";

let client: Anthropic | null = null;

export function getClient(): Anthropic | null {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) return null;

  if (!client) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

export interface LlmCallOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function callLlm(
  systemPrompt: string,
  userMessage: string,
  options: LlmCallOptions = {}
): Promise<string> {
  const cli = getClient();
  if (!cli) {
    return "";
  }

  const model = options.model ?? getCtxModel();
  const maxTokens = options.maxTokens ?? 1024;

  try {
    const response = await cli.messages.create({
      model,
      max_tokens: maxTokens,
      temperature: options.temperature ?? 0.3,
      system: systemPrompt,
      messages: [
        { role: "user", content: userMessage },
      ],
    });

    const block = response.content[0];
    if (block.type === "text") {
      return block.text.trim();
    }
    return "";
  } catch (err) {
    console.error(`[ctx] LLM call failed: ${String(err)}`);
    return "";
  }
}

export function isAvailable(): boolean {
  return getClient() !== null;
}
