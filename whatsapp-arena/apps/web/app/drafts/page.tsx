import { prisma, DraftStatus } from "@arena/db";
import { DraftRow } from "../../components/DraftRow";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const drafts = await prisma.draft.findMany({
    where: { status: DraftStatus.PENDING },
    include: { chat: true, replyToMessage: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1>Pending drafts</h1>
      {drafts.length === 0 && <p>No pending drafts.</p>}
      {drafts.map((d) => (
        <DraftRow
          key={d.id}
          id={d.id}
          chatName={d.chat.name}
          isGroup={d.chat.isGroup}
          replyTo={d.replyToMessage?.body ?? null}
          body={d.body}
        />
      ))}
    </div>
  );
}
