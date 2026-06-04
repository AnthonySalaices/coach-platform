// Minimal landing placeholder. Feature UIs (coach/client dashboards, booking
// flow) are intentionally NOT built yet — this is the foundation scaffold.
import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Coaching Platform</h1>
      <p style={{ color: "var(--muted)" }}>
        Self-hostable coaching platform for gamers. This instance is freshly
        scaffolded — the foundation (auth, payments, data model, deploy shell)
        is wired up; feature UIs come next.
      </p>
      <p style={{ marginTop: "1.5rem" }}>
        <Link href="/api/auth/signin" prefetch={false}>
          Sign in with Discord →
        </Link>
      </p>
    </main>
  );
}
