import { anthropic } from "@workspace/integrations-anthropic-ai";
import { logger } from "./logger";

const MODEL = "claude-sonnet-4-6";

export async function aiText(
  system: string,
  prompt: string,
  maxTokens = 8192,
): Promise<string> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const block = message.content[0];
  return block && block.type === "text" ? block.text : "";
}

/** Ask for JSON and parse it, tolerating markdown fences. */
export async function aiJson<T>(
  system: string,
  prompt: string,
  maxTokens = 8192,
): Promise<T> {
  const raw = await aiText(
    `${system}\nRespond ONLY with valid JSON. No prose, no markdown fences.`,
    prompt,
    maxTokens,
  );
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "");
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    logger.error({ err, raw: cleaned.slice(0, 500) }, "AI JSON parse failed");
    throw new Error("AI returned invalid JSON");
  }
}
