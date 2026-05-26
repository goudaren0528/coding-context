import type { InjectionInput } from "./injection-input.js";

export interface AgentAdapter {
  name: string;
  tool: "claude" | "opencode";
  binaryName: string;

  detect(): Promise<boolean>;

  buildInjection(input: InjectionInput): Promise<string>;

  buildEnv(context: string): Record<string, string>;
}
