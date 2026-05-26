import { startTool } from "./shared.js";

export async function opencodeCommand(): Promise<void> {
  await startTool("opencode");
}
