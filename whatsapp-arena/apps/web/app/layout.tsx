import Link from "next/link";

export const metadata = { title: "WhatsApp Arena" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", margin: 0 }}>
        <nav style={{ padding: 16, borderBottom: "1px solid #eee", display: "flex", gap: 16 }}>
          <Link href="/inbox">Inbox</Link>
          <Link href="/drafts">Drafts</Link>
          <Link href="/persona">Persona</Link>
        </nav>
        <main style={{ padding: 24 }}>{children}</main>
      </body>
    </html>
  );
}
