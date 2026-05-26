const DEFAULT_EXCLUDE_PATTERNS = [
  ".env",
  ".env.*",
  "*.pem",
  "*.key",
  "*.pfx",
  "*.p12",
  "secrets/**",
  "credentials/**",
  "node_modules/**",
  ".git/**",
  ".ctx/**",
  ".sybermem/**",
  "dist/**",
  "*.sqlite",
  "*.db",
];

export function isExcluded(filePath: string, extraPatterns: string[] = []): boolean {
  const patterns = [...DEFAULT_EXCLUDE_PATTERNS, ...extraPatterns];
  const normalized = filePath.replace(/\\/g, "/");

  for (const pattern of patterns) {
    if (matchPattern(normalized, pattern)) {
      return true;
    }
  }

  return false;
}

function matchPattern(path: string, pattern: string): boolean {
  if (pattern.includes("/")) {
    const regexStr = pattern
      .replace(/\./g, "\\.")
      .replace(/\*\*/g, "____DEEP____")
      .replace(/\*/g, "[^/]*")
      .replace(/____DEEP____/g, ".*");
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(path);
  }

  if (pattern.startsWith("*.")) {
    const ext = pattern.slice(1);
    return path.endsWith(ext);
  }

  if (pattern.includes("*")) {
    const regex = new RegExp(
      `^${pattern.replace(/\./g, "\\.").replace(/\*/g, "[^/]*")}$`
    );
    return regex.test(path);
  }

  return path === pattern || path.endsWith("/" + pattern) || path.includes("/" + pattern + "/");
}
