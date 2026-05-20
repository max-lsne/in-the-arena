"use client";
import { useState, useTransition } from "react";

export function PersonaForm({ about: initAbout, voice: initVoice }: { about: string; voice: string }) {
  const [about, setAbout] = useState(initAbout);
  const [voice, setVoice] = useState(initVoice);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      await fetch("/api/persona", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ about, voice }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 600 }}>
      <label>
        About you
        <textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          rows={6}
          style={{ width: "100%", padding: 8 }}
        />
      </label>
      <label>
        Voice / tone
        <textarea
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          rows={4}
          style={{ width: "100%", padding: 8 }}
        />
      </label>
      <div>
        <button onClick={save} disabled={pending}>Save</button>
        {saved && <span style={{ marginLeft: 8, color: "green" }}>Saved</span>}
      </div>
    </div>
  );
}
