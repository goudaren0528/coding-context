import { describe, it, expect } from "vitest";
import { redactSecrets, redactEnvAssignments, redactForLlm } from "../../src/privacy/redactor.js";

describe("redactor", () => {
  it("redacts Anthropic API keys", () => {
    const input = "Using key: sk-ant-api03-abcdefghijklmnopqrstuvwxyz123456";
    const result = redactSecrets(input);
    expect(result).not.toContain("sk-ant-api03");
    expect(result).toContain("[REDACTED]");
  });

  it("redacts GitHub tokens", () => {
    const input = "export GITHUB_TOKEN=ghp_1234567890abcdef1234567890abcdef123456";
    const result = redactSecrets(input);
    expect(result).not.toContain("ghp_");
    expect(result).toContain("[REDACTED]");
  });

  it("redacts OpenAI-style keys", () => {
    const input = "Authorization: Bearer sk-abc123def456ghi789jkl012mno345pqr678stu";
    const result = redactSecrets(input);
    expect(result).toContain("[REDACTED]");
  });

  it("redacts private key blocks", () => {
    const input = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC
-----END PRIVATE KEY-----`;
    const result = redactSecrets(input);
    expect(result).not.toContain("MIIEvQI");
    expect(result).toContain("[REDACTED]");
  });

  it("redacts JWT tokens", () => {
    const input = "token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    const result = redactSecrets(input);
    expect(result).toContain("[REDACTED]");
  });

  it("redacts AWS access keys", () => {
    const input = "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE";
    const result = redactSecrets(input);
    expect(result).toContain("[REDACTED]");
  });

  it("redacts env var values but preserves key names", () => {
    const input = "DATABASE_URL=postgres://user:pass@localhost/db\nSECRET_KEY=my-secret-123";
    const result = redactEnvAssignments(input);
    expect(result).toContain("DATABASE_URL=[REDACTED]");
    expect(result).toContain("SECRET_KEY=[REDACTED]");
    expect(result).not.toContain("my-secret-123");
  });

  it("preserves non-sensitive env vars", () => {
    const input = "PATH=/usr/local/bin\nHOME=/home/user\nUSER=john";
    const result = redactEnvAssignments(input);
    expect(result).toContain("PATH=/usr/local/bin");
    expect(result).toContain("HOME=/home/user");
    expect(result).toContain("USER=john");
  });

  it("redactForLlm applies both secret and env redaction", () => {
    const input = "GH_TOKEN=ghp_secret123\nAPI_KEY=sk-ant-key456";
    const result = redactForLlm(input);
    expect(result).not.toContain("ghp_secret123");
    expect(result).not.toContain("sk-ant-key456");
  });

  it("passes through clean text unchanged", () => {
    const input = "Hello, this is a normal message about retry architecture.";
    const result = redactSecrets(input);
    expect(result).toBe(input);
  });
});
