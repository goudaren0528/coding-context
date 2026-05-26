import * as dotenv from "dotenv";
import * as fs from "fs";
import { getProjectConfigPath } from "./paths.js";
import type { ProjectConfig } from "./types.js";

dotenv.config();

export function getAnthropicApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY;
}

export function getCtxModel(): string {
  return process.env.CTX_MODEL ?? "claude-sonnet-4-20250514";
}

export function getEventTtlDays(): number {
  return parseInt(process.env.CTX_EVENT_TTL_DAYS ?? "14", 10);
}

export function getL2SessionThreshold(): number {
  return parseInt(process.env.CTX_L2_SESSION_THRESHOLD ?? "10", 10);
}

export function getL2DayThreshold(): number {
  return parseInt(process.env.CTX_L2_DAY_THRESHOLD ?? "7", 10);
}

export function loadProjectConfig(projectRoot: string): ProjectConfig | null {
  const path = getProjectConfigPath(projectRoot);
  if (!fs.existsSync(path)) return null;
  try {
    return JSON.parse(fs.readFileSync(path, "utf-8")) as ProjectConfig;
  } catch {
    return null;
  }
}

export function saveProjectConfig(projectRoot: string, config: ProjectConfig): void {
  const path = getProjectConfigPath(projectRoot);
  fs.writeFileSync(path, JSON.stringify(config, null, 2), "utf-8");
}
