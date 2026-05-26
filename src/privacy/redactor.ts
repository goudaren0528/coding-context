const SECRET_PATTERNS: RegExp[] = [
  /(?:api[-_]?key|apikey|secret|token|password|passwd|auth)\s*[:=]\s*['"]?([^\s\n"'`]+)['"]?/gi,
  /sk-[a-zA-Z0-9]{20,}/g,
  /sk-ant-[a-zA-Z0-9-_]{20,}/g,
  /ghp_[a-zA-Z0-9]{36}/g,
  /gho_[a-zA-Z0-9]{36}/g,
  /ghu_[a-zA-Z0-9]{36}/g,
  /ghs_[a-zA-Z0-9]{36}/g,
  /ghr_[a-zA0-9]{36}/g,
  /xox[bpras]-[a-zA-Z0-9-]+/g,
  /AKIA[0-9A-Z]{16}/g,
  /-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----/g,
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
  /AIza[0-9A-Za-z\-_]{35}/g,
  /ya29\.[0-9A-Za-z\-_]+/g,
  /rghp_[a-zA-Z0-9]{36}/g,
  /-----BEGIN PGP PRIVATE KEY BLOCK-----[\s\S]*?-----END PGP PRIVATE KEY BLOCK-----/g,
];

const ENV_VAR_VALUE_PATTERN = /([A-Z_]{3,})\s*=\s*['"]?([^\s\n"'`]{8,80})['"]?/gi;

export function redactSecrets(text: string): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }
  return result;
}

export function redactEnvAssignments(text: string): string {
  return text.replace(ENV_VAR_VALUE_PATTERN, (match, name) => {
    if (name === "PATH" || name === "HOME" || name === "USER") return match;
    return `${name}=[REDACTED]`;
  });
}

export function redactForLlm(text: string): string {
  let result = redactSecrets(text);
  result = redactEnvAssignments(result);
  return result;
}
