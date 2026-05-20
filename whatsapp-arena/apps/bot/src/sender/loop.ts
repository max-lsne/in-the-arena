import type { Client } from "whatsapp-web.js";
import { prisma, DraftStatus } from "@arena/db";

const INTERVAL = Number(process.env.SENDER_INTERVAL_MS ?? 5_000);

export function startSender(client: Client) {
  console.log("sender: started");
  setInterval(() => tick(client), INTERVAL);
}

async function tick(client: Client) {
  const approved = await prisma.draft.findMany({
    where: { status: DraftStatus.APPROVED },
    take: 5,
  });

  for (const draft of approved) {
    try {
      await client.sendMessage(draft.chatId, draft.body);
      await prisma.draft.update({
        where: { id: draft.id },
        data: { status: DraftStatus.SENT, sentAt: new Date() },
      });
    } catch (err) {
      console.error("send failed", draft.id, err);
    }
  }
}
