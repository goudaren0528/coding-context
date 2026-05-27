import * as dotenv from "dotenv";
import * as fs from "fs";
import { getProjectConfigPath } from "./paths.js";
import type { ProjectConfig, ResolvedLlmConfig } from "./types.js";

dotenv.config();

function normalizeEnvValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getCtxApiKey(): string | null {
  return normalizeEnvValue(process.env.CTX_API_KEY);
}

export function getCtxBaseUrl(): string | null {
  return normalizeEnvValue(process.env.CTX_BASE_URL);
}

export function getCtxModel(): string | null {
  return normalizeEnvValue(process.env.CTX_MODEL);
}

export function resolveLlmConfig(projectConfig: ProjectConfig | null): ResolvedLlmConfig {
  const llm = projectConfig?.llm;
  return {
    enabled: llm?.enabled ?? true,
    model: llm?.model ?? getCtxModel(),
    baseUrl: llm?.baseUrl ?? getCtxBaseUrl(),
    apiKey: getCtxApiKey(),
  };
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
