import { callLlm, isAvailable } from "../llm/client.js";

const RETRIEVER_SYSTEM = `You are the ctx memory retriever. Answer the user's question by searching through their project memory.

Below you will find:
1. Current workspace state
2. Recent session summaries
3. Historical decisions

Answer concisely. If the answer is not found in the provided context, say "I don't have enough context to answer that." Do not fabricate.`;

export async function askQuestion(
  question: string,
  workspaceStateSummary: string,
  sessionContext: string,
  decisionContext: string
): Promise<string | null> {
  if (!isAvailable()) {
    return null;
  }

  const contextBlocks: string[] = [];

  if (workspaceStateSummary) {
    contextBlocks.push(`## Current Workspace State\n\n${workspaceStateSummary}`);
  }

  if (sessionContext) {
    contextBlocks.push(`## Recent Sessions\n\n${sessionContext}`);
  }

  if (decisionContext) {
    contextBlocks.push(`## Historical Decisions\n\n${decisionContext}`);
  }

  const context = contextBlocks.length > 0
    ? contextBlocks.join("\n\n---\n\n")
    : "No prior project memory available.";

  const result = await callLlm(
    RETRIEVER_SYSTEM,
    `${context}\n\n---\n\nQuestion: ${question}`,
    { maxTokens: 1024 }
  );

  return result || null;
}
