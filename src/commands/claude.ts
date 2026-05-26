import { startTool } from "./shared.js";

export async function claudeCommand(): Promise<void> {
  await startTool("claude");
}
