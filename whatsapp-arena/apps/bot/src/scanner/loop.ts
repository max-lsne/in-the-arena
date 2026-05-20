import { prisma } from "@arena/db";
import { scanMessage, draftReply } from "@arena/ai";

const INTERVAL = Number(process.env.SCAN_INTERVAL_MS ?? 60_000);

export function startScanner() {
  console.log("scanner: started");
  setInterval(tick, INTERVAL);
  tick();
}

async function tick() {
  const unscanned = await prisma.message.findMany({
    where: { scannedAt: null, fromMe: false },
    include: { chat: true },
    orderBy: { timestamp: "asc" },
    take: 20,
  });

  for (const msg of unscanned) {
    if (!msg.chat.scanEnabled) {
      await prisma.message.update({
        where: { id: msg.id },
        data: { scannedAt: new Date(), interesting: false },
      });
      continue;
    }

    const recent = await prisma.message.findMany({
      where: { chatId: msg.chatId, timestamp: { lt: msg.timestamp } },
      orderBy: { timestamp: "desc" },
      take: 5,
    });

    try {
      const verdict = await scanMessage({
        chatName: msg.chat.name,
        isGroup: msg.chat.isGroup,
        body: msg.body,
        recentContext: recent
          .reverse()
          .map((m) => `${m.authorName}: ${m.body}`),
      });

      await prisma.message.update({
        where: { id: msg.id },
        data: {
          scannedAt: new Date(),
          interesting: verdict.interesting,
          scanScore: verdict.score,
          scanReason: verdict.reason,
        },
      });

      if (verdict.interesting) {
        await maybeDraft(msg.id);
      }
    } catch (err) {
      console.error("scan failed", msg.id, err);
    }
  }
}

async function maybeDraft(messageId: string) {
  const msg = await prisma.message.findUniqueOrThrow({
    where: { id: messageId },
    include: { chat: true },
  });

  const persona = await prisma.persona.findUnique({ where: { id: 1 } });
  if (!persona) return;

  const recent = await prisma.message.findMany({
    where: { chatId: msg.chatId },
    orderBy: { timestamp: "desc" },
    take: 10,
  });

  const result = await draftReply({
    chatId: msg.chatId,
    chatName: msg.chat.name,
    isGroup: msg.chat.isGroup,
    replyToMessageId: msg.id,
    recentMessages: recent
      .reverse()
      .map((m) => ({ authorName: m.authorName, body: m.body, fromMe: m.fromMe })),
    persona: { about: persona.about, voice: persona.voice },
  });

  await prisma.draft.create({
    data: {
      chatId: msg.chatId,
      replyToMessageId: msg.id,
      body: result.body,
      model: result.model,
    },
  });
}
