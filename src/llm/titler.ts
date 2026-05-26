import { callLlm } from "./client.js";

const TITLER_SYSTEM = `You are the ctx session titler. Given a transcript of an AI coding session, generate a concise title (max 10 words) and a 1-sentence summary of focus area.

Output JSON only:
{"title": "...", "focus": "..."}`;

export async function generateTitle(
  eventsText: string
): Promise<{ title: string; focus: string } | null> {
  const eventsTruncated = eventsText.slice(0, 8000);
  const result = await callLlm(TITLER_SYSTEM, `Session transcript:\n${eventsTruncated}`);
  if (!result) return null;

  try {
    const parsed = JSON.parse(result);
    return {
      title: parsed.title ?? "Untitled session",
      focus: parsed.focus ?? "",
    };
  } catch {
    const firstLine = result.split("\n")[0].trim();
    return { title: firstLine.slice(0, 100) || "Untitled session", focus: "" };
  }
}
