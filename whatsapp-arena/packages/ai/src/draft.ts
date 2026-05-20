import { anthropic, MODEL } from "./client";
import type { DraftRequest, DraftResult } from "@arena/shared";

export async function draftReply(req: DraftRequest): Promise<DraftResult> {
  const system = `You draft WhatsApp replies in the user's voice.
About the user: ${req.persona.about}
Voice/tone guidelines: ${req.persona.voice}
Keep replies short, natural, and matching the chat's register.
Output the reply text only — no quotes, no preamble.`;

  const transcript = req.recentMessages
    .map((m) => `${m.fromMe ? "Me" : m.authorName}: ${m.body}`)
    .join("\n");

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    system,
    messages: [
      {
        role: "user",
        content: `Chat: ${req.chatName} (${req.isGroup ? "group" : "dm"})

Recent messages:
${transcript}

Draft my reply.`,
      },
    ],
  });

  const body = res.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("")
    .trim();

  return { body, model: MODEL };
}
