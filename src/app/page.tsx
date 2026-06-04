import Link from "next/link";
import { auth } from "@/server/auth";
import { listCoaches, type CoachListing } from "@/server/db/repos/coachProfiles";
import { listServicesByCoach } from "@/server/db/repos/services";
import { getCoachRatings, type CoachRating } from "@/server/db/repos/reviews";
import { formatMoney } from "@/lib/money";
import type { Service } from "@/server/db/schema";

interface CoachCardData {
  coach: CoachListing;
  services: Service[];
  rating?: CoachRating;
}

export default async function Home() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  const coaches = await listCoaches();
  const ratings = await getCoachRatings(coaches.map((c) => c.userId));
  const servicesPerCoach = await Promise.all(
    coaches.map((c) => listServicesByCoach(c.userId, { activeOnly: true })),
  );

  // Bucket coaches under each game they coach.
  const byGame = new Map<string, CoachCardData[]>();
  coaches.forEach((coach, i) => {
    const data: CoachCardData = {
      coach,
      services: servicesPerCoach[i]!,
      rating: ratings.get(coach.userId),
    };
    for (const game of coach.games) {
      const list = byGame.get(game) ?? [];
      list.push(data);
      byGame.set(game, list);
    }
  });
  const games = [...byGame.keys()].sort();

  return (
    <div>
      <nav className="landing-nav">
        <span className="brand">⚡ GG Coach</span>
        <div className="nav-actions">
          <a href="#coaches" className="nav-ghost">
            Browse coaches
          </a>
          {signedIn ? (
            <Link className="btn-primary" href="/dashboard">
              Dashboard →
            </Link>
          ) : (
            <Link
              className="btn-primary"
              href="/api/auth/signin?callbackUrl=/dashboard"
              prefetch={false}
            >
              Sign in with Discord
            </Link>
          )}
        </div>
      </nav>

      {/* hero */}
      <section className="hero">
        <span className="eyebrow">for players who are done being hardstuck</span>
        <h1 className="hero-title">
          Stop coping.
          <br />
          Start climbing.
        </h1>
        <p className="hero-sub">
          Book 1-on-1 sessions with top-ranked coaches across your favorite
          games. VOD reviews, live duos, and a plan that actually moves your
          rank — not vibes.
        </p>
        <div className="cta-row">
          <Link
            className="btn-primary lg"
            href={signedIn ? "/dashboard/coaches" : "/api/auth/signin?callbackUrl=/dashboard"}
            prefetch={false}
          >
            {signedIn ? "Find a coach" : "Get started — it's free to browse"}
          </Link>
          <a href="#how" className="btn-ghost lg">
            How it works
          </a>
        </div>
        <div className="hero-trust">
          {coaches.length} coaches · {games.length} games · pay securely with
          Stripe
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="section">
        <h2 className="section-title">How it works</h2>
        <div className="steps">
          {[
            ["1", "Find your coach", "Filter by game and pick a verified, top-ranked coach who fits your goals."],
            ["2", "Book a session", "Secure Stripe checkout. A private Discord channel spins up for the two of you."],
            ["3", "Level up", "VOD breakdowns, live coaching, and homework. Then rate your session."],
          ].map(([n, title, body]) => (
            <div key={n} className="step">
              <div className="step-n">{n}</div>
              <strong>{title}</strong>
              <p className="muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* coaches by game */}
      <section id="coaches" className="section">
        <h2 className="section-title">Browse coaches by game</h2>
        {games.length === 0 && (
          <p className="muted">No coaches listed yet — check back soon.</p>
        )}
        {games.map((game) => (
          <div key={game} className="game-block">
            <div className="game-head">
              <span className="game-pill">{game}</span>
              <span className="muted">{byGame.get(game)!.length} coaches</span>
            </div>
            <div className="coach-grid">
              {byGame.get(game)!.map(({ coach, services, rating }) => {
                const from =
                  services.length > 0
                    ? Math.min(...services.map((s) => s.price))
                    : null;
                const currency = services[0]?.currency ?? "usd";
                return (
                  <div className="coach-card" key={coach.userId}>
                    <div className="coach-card-top">
                      <strong>{coach.name}</strong>
                      {rating ? (
                        <span className="stars" title={`${rating.avg.toFixed(1)}/5`}>
                          ★ {rating.avg.toFixed(1)}{" "}
                          <span className="muted">({rating.count})</span>
                        </span>
                      ) : (
                        <span className="muted" style={{ fontSize: "0.78rem" }}>
                          New
                        </span>
                      )}
                    </div>
                    <div className="coach-games">{coach.games.join(" · ")}</div>
                    {coach.bio && <p className="coach-bio">{coach.bio}</p>}
                    <div className="coach-card-foot">
                      <span className="muted">
                        {from != null ? (
                          <>
                            from <strong>{formatMoney(from, currency)}</strong>
                          </>
                        ) : (
                          "no services yet"
                        )}
                      </span>
                      <Link
                        className="btn-primary sm"
                        href={
                          signedIn
                            ? "/dashboard/coaches"
                            : "/api/auth/signin?callbackUrl=/dashboard/coaches"
                        }
                        prefetch={false}
                      >
                        {signedIn ? "View" : "Sign in to book"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <footer className="landing-footer">
        <span className="muted">
          ⚡ GG Coach — open-source, self-hosted coaching.
        </span>
        <a
          className="muted"
          href="https://github.com/AnthonySalaices/coach-platform"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}
