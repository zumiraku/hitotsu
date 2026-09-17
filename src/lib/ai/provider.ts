import Anthropic from "@anthropic-ai/sdk";

// AI アシストは任意。キーがなければすべてルールベースで動く
export function aiEnabled() {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function aiModel() {
  return process.env.AI_MODEL || "claude-opus-5";
}

let client: Anthropic | null = null;

function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

// 文章生成。失敗したら null を返して呼び出し側でルールベースに戻す
export async function complete(opts: { system: string; prompt: string; maxTokens?: number; effort?: "low" | "medium" | "high" }): Promise<string | null> {
  if (!aiEnabled()) return null;
  try {
    const res = await getClient().messages.create({
      model: aiModel(),
      max_tokens: opts.maxTokens ?? 8000,
      system: opts.system,
      output_config: { effort: opts.effort ?? "medium" },
      messages: [{ role: "user", content: opts.prompt }],
    });
    if (res.stop_reason === "refusal") return null;
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return text || null;
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.error("AI request failed", e.status, e.message);
    else console.error("AI request failed", e);
    return null;
  }
}
