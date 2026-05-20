import { prisma } from "@arena/db";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const messages = await prisma.message.findMany({
    where: { interesting: true },
    include: { chat: true },
    orderBy: { timestamp: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1>Interesting messages</h1>
      {messages.length === 0 && <p>No interesting messages yet.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {messages.map((m) => (
          <li key={m.id} style={{ borderBottom: "1px solid #eee", padding: "12px 0" }}>
            <div style={{ fontSize: 12, color: "#666" }}>
              {m.chat.name} {m.chat.isGroup ? "(group)" : ""} ·{" "}
              {m.timestamp.toLocaleString()}
            </div>
            <div style={{ fontWeight: 500 }}>{m.authorName}</div>
            <div>{m.body}</div>
            {m.scanReason && (
              <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                why: {m.scanReason}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
