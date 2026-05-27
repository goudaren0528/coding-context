import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

async function loadClientModule() {
  vi.resetModules();
  vi.stubGlobal("fetch", fetchMock);
  return import("../../src/llm/client.js");
}

describe("llm client", () => {
  beforeEach(() => {
    vi.stubEnv("CTX_MODEL", "gpt-4.1-mini");
    vi.stubEnv("CTX_BASE_URL", "https://llm.example.test/v1");
    vi.stubEnv("CTX_API_KEY", "secret");
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reports available only when config is complete", async () => {
    vi.stubEnv("CTX_MODEL", "");
    const { isAvailable } = await loadClientModule();
    expect(isAvailable()).toBe(false);
  });

  it("posts a chat completions request and returns first message text", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: '{"title":"Done"}' } },
        ],
      }),
    });

    const { callLlm } = await loadClientModule();
    const result = await callLlm("system prompt", "user prompt", { maxTokens: 55, temperature: 0.1 });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://llm.example.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer secret",
        }),
      })
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0][1];
    expect(JSON.parse(String(request.body))).toEqual({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "system prompt" },
        { role: "user", content: "user prompt" },
      ],
      temperature: 0.1,
      max_tokens: 55,
    });
    expect(result).toBe('{"title":"Done"}');
  });

  it("returns empty string on network failure", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchMock.mockRejectedValue(new Error("socket hang up"));

    const { callLlm } = await loadClientModule();
    const result = await callLlm("system prompt", "user prompt");

    expect(result).toBe("");
    expect(errorSpy).toHaveBeenCalledWith("[ctx] LLM call failed: Error: socket hang up");
  });
});
