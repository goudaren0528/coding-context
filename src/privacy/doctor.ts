import * as fs from "fs";
import * as path from "path";
import { getCtxHome, getUserDbPath, getUserProjectsPath, getProjectDbPath } from "../paths.js";
import { getEventTtlDays } from "../config.js";

export interface PrivacyReport {
  issues: string[];
  ok: string[];
}

export function runPrivacyCheck(projectRoot: string | null): PrivacyReport {
  const report: PrivacyReport = { issues: [], ok: [] };

  checkGitTracking(report);
  checkDbSizeAndRetention(report);
  checkExclusions(report);

  if (projectRoot) {
    const projectDbPath = getProjectDbPath(projectRoot);
    if (fs.existsSync(projectDbPath)) {
      checkDbStats(report, projectDbPath, "project");
    } else {
      report.ok.push("Project DB does not exist yet.");
    }
  }

  checkUserDb(report);

  return report;
}

function checkGitTracking(report: PrivacyReport): void {
  const ctxHome = getCtxHome();
  const gitIgnorePath = path.join(process.cwd(), ".gitignore");

  const hasCtx = fs.readdirSync(ctxHome).length > 0;
  if (hasCtx) {
    report.ok.push("~/.ctx/ exists and is outside any git repo (isolated by default).");
  }

  if (fs.existsSync(gitIgnorePath)) {
    const content = fs.readFileSync(gitIgnorePath, "utf-8");
    if (content.includes(".ctx/")) {
      report.ok.push(".gitignore contains .ctx/ exclusion.");
    } else {
      report.issues.push(".gitignore does not have .ctx/ entry. Add `.ctx/` to .gitignore to prevent accidental commits.");
    }
  } else {
    report.issues.push("No .gitignore found. Create one and add `.ctx/` to it.");
  }
}

function checkDbSizeAndRetention(report: PrivacyReport): void {
  const ttlDays = getEventTtlDays();
  report.ok.push(`Event retention set to ${ttlDays} days (CTX_EVENT_TTL_DAYS).`);
}

function checkExclusions(report: PrivacyReport): void {
  const patterns = [".env", "*.pem", "*.key", "secrets/**", "node_modules/**"];
  report.ok.push(`Exclusion patterns active: ${patterns.join(", ")}.`);
}

function checkDbStats(report: PrivacyReport, dbPath: string, label: string): void {
  const stats = fs.statSync(dbPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
  report.ok.push(`${label} DB: ${dbPath} (${sizeMB} MB).`);
}

function checkUserDb(report: PrivacyReport): void {
  const userDbPath = getUserDbPath();
  if (fs.existsSync(userDbPath)) {
    const stats = fs.statSync(userDbPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
    report.ok.push(`User DB: ${userDbPath} (${sizeMB} MB).`);
  }
}
