import { execSync } from "child_process";
import type { AgentAdapter } from "./agent-adapter.js";
import type { InjectionInput } from "./injection-input.js";

class ClaudeCodeAdapter implements AgentAdapter {
  name = "Claude Code";
  tool = "claude" as const;
  binaryName = "claude";

  async detect(): Promise<boolean> {
    try {
      execSync("claude --version", { stdio: "ignore", timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async buildInjection(input: InjectionInput): Promise<string> {
    const blocks = [
      input.injectionBlocks.l2,
      input.injectionBlocks.l3,
      input.injectionBlocks.l4,
    ].filter(Boolean) as string[];

    return blocks.join("\n\n");
  }

  buildEnv(context: string): Record<string, string> {
    return { CTX_CONTEXT: context };
  }
}

export const claudeCodeAdapter = new ClaudeCodeAdapter();
