"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  chatName: string;
  isGroup: boolean;
  replyTo: string | null;
  body: string;
};

export function DraftRow({ id, chatName, isGroup, replyTo, body }: Props) {
  const [text, setText] = useState(body);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function act(action: "approve" | "discard") {
    startTransition(async () => {
      await fetch(`/api/drafts/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, body: text }),
      });
      router.refresh();
    });
  }

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: "#666" }}>
        {chatName} {isGroup ? "(group)" : ""}
      </div>
      {replyTo && (
        <div style={{ fontSize: 13, color: "#555", borderLeft: "2px solid #ccc", paddingLeft: 8, margin: "8px 0" }}>
          {replyTo}
        </div>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ width: "100%", minHeight: 80, padding: 8, fontFamily: "inherit" }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={() => act("approve")} disabled={pending}>
          Approve & send
        </button>
        <button onClick={() => act("discard")} disabled={pending}>
          Discard
        </button>
      </div>
    </div>
  );
}
