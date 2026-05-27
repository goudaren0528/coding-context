import type { ProjectConfig } from "../types.js";
import { resolveLlmConfig } from "../config.js";

export interface LlmReport {
  issues: string[];
  ok: string[];
}

export function runLlmCheck(projectConfig: ProjectConfig | null): LlmReport {
  const report: LlmReport = { issues: [], ok: [] };
  const config = resolveLlmConfig(projectConfig);

  if (config.enabled) {
    report.ok.push("LLM features are enabled.");
  } else {
    report.issues.push("LLM features are disabled in project config.");
  }

  if (config.model) {
    report.ok.push(`Model configured: ${config.model}`);
  } else {
    report.issues.push("Missing CTX_MODEL or project-level llm.model.");
  }

  if (config.baseUrl) {
    report.ok.push(`Base URL configured: ${config.baseUrl}`);
  } else {
    report.issues.push("Missing CTX_BASE_URL or project-level llm.baseUrl.");
  }

  if (config.apiKey) {
    report.ok.push("API key configured via CTX_API_KEY.");
  } else {
    report.issues.push("Missing CTX_API_KEY.");
  }

  return report;
}
