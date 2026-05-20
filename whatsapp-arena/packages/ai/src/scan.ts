import { anthropic, MODEL } from "./client";
import type { ScanVerdict } from "@arena/shared";

const SYSTEM = `You triage incoming WhatsApp messages for the user.
Decide whether a message is "interesting" — meaning it surfaces news,
an opportunity, a question that needs the user's input, or a notable update.
Filter out small talk, reactions, memes, and routine logistics.
Respond ONLY as JSON: {"interesting": boolean, "score": 0-1, "reason": "..."}.`;

export async function scanMessage(args: {
  chatName: string;
  isGroup: boolean;
  body: string;
  recentContext: string[];
}): Promise<ScanVerdict> {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Chat: ${args.chatName} (${args.isGroup ? "group" : "dm"})
Recent context:
${args.recentContext.join("\n")}

New message:
${args.body}`,
      },
    ],
  });

  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("");

  return JSON.parse(text) as ScanVerdict;
}
