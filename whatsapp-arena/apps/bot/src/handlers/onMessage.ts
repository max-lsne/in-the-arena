import type { Client, Message } from "whatsapp-web.js";
import { prisma } from "@arena/db";

export async function onMessage(_client: Client, msg: Message) {
  const chat = await msg.getChat();
  const contact = await msg.getContact();

  await prisma.chat.upsert({
    where: { id: chat.id._serialized },
    create: {
      id: chat.id._serialized,
      name: chat.name,
      isGroup: chat.isGroup,
    },
    update: { name: chat.name },
  });

  await prisma.message.create({
    data: {
      id: msg.id._serialized,
      chatId: chat.id._serialized,
      authorName: contact.pushname ?? contact.number ?? "unknown",
      authorPhone: contact.number ?? null,
      body: msg.body,
      fromMe: msg.fromMe,
      timestamp: new Date(msg.timestamp * 1000),
    },
  });
}
