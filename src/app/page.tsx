import Link from "next/link";
import { auth } from "@/server/auth";
import { listCoaches, type CoachListing } from "@/server/db/repos/coachProfiles";
import { listServicesByCoach } from "@/server/db/repos/services";
import { getCoachRatings, type CoachRating } from "@/server/db/repos/reviews";
import { getSiteName } from "@/server/db/repos/settings";
import { getSiteCopy } from "@/server/db/repos/siteCopy";
import { formatMoney } from "@/lib/money";
import { Avatar } from "@/components/Avatar";
import { LandingFx } from "@/components/LandingFx";
import type { Service } from "@/server/db/schema";

interface CoachCardData {
  coach: CoachListing;
  services: Service[];
  rating?: CoachRating;
}

export default async function Home() {
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const siteName = await getSiteName();
  const copy = await getSiteCopy();

  const tickerItems = copy["ticker.items"]
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const steps = [1, 2, 3].map((n) => ({
    tag: copy[`how.step${n}.tag` as keyof typeof copy],
    title: copy[`how.step${n}.title` as keyof typeof copy],
    body: copy[`how.step${n}.body` as keyof typeof copy],
  }));

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
    <div className="landing-root">
      <LandingFx />

      <nav className="landing-nav">
        <span className="brand">
          <span className="brand-bolt">⚡</span> {siteName}
        </span>
        <div className="nav-actions">
          <a href="#how" className="nav-ghost">
            {copy["nav.gameplan"]}
          </a>
          <a href="#coaches" className="nav-ghost">
            {copy["nav.roster"]}
          </a>
          {signedIn ? (
            <Link className="btn-primary" href="/dashboard">
              dashboard →
            </Link>
          ) : (
            <Link
              className="btn-primary"
              href="/signin?callbackUrl=/dashboard"
              prefetch={false}
            >
              {copy["nav.signin"]}
            </Link>
          )}
        </div>
      </nav>

      {/* hero */}
      <section className="hero hud-frame">
        <span className="eyebrow">{copy["hero.eyebrow"]}</span>
        <h1 className="hero-title">
          <span data-decode>{copy["hero.title1"]}</span>
          <br />
          <span className="volt" data-decode>
            {copy["hero.title2"]}
          </span>
        </h1>
        <p className="hero-sub" data-reveal="1">
          {copy["hero.sub"]}
        </p>
        <div className="cta-row" data-reveal="2">
          <Link
            className="btn-primary lg"
            href={
              signedIn
                ? "/dashboard/coaches"
                : "/signin?callbackUrl=/dashboard"
            }
            prefetch={false}
          >
            {signedIn ? "find a coach" : copy["hero.cta"]}
          </Link>
          <a href="#how" className="btn-ghost lg">
            {copy["hero.cta2"]}
          </a>
        </div>
        <div className="hero-readout" data-reveal="3">
          <span>
            coaches <strong>{String(coaches.length).padStart(2, "0")}</strong>
          </span>
          <span>
            games <strong>{String(games.length).padStart(2, "0")}</strong>
          </span>
          <span>
            payments <strong>stripe secured</strong>
          </span>
        </div>
      </section>

      {/* marquee ticker */}
      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i}>
              {item} <em>//</em>
            </span>
          ))}
        </div>
      </div>

      {/* how it works */}
      <section id="how" className="section">
        <div className="section-head" data-reveal="0">
          <span className="section-no">01</span>
          <h2 className="section-title">{copy["how.title"]}</h2>
        </div>
        <div className="steps">
          {steps.map(({ tag, title, body }, i) => (
            <div key={i} className="step" data-reveal={i + 1}>
              <div className="step-tag">
                <span className="step-n">{String(i + 1).padStart(2, "0")}</span>
                {tag}
              </div>
              <strong>{title}</strong>
              <p className="muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* coaches by game */}
      <section id="coaches" className="section">
        <div className="section-head" data-reveal="0">
          <span className="section-no">02</span>
          <h2 className="section-title">{copy["roster.title"]}</h2>
        </div>
        {games.length === 0 && (
          <p className="muted">{copy["roster.empty"]}</p>
        )}
        {games.map((game) => (
          <div key={game} className="game-block">
            <div className="game-head" data-reveal="0">
              <span className="game-pill">{game}</span>
              <span className="game-count">
                {byGame.get(game)!.length} coach
                {byGame.get(game)!.length === 1 ? "" : "es"} active
              </span>
            </div>
            <div className="coach-grid">
              {byGame.get(game)!.map(({ coach, services, rating }, i) => {
                const from =
                  services.length > 0
                    ? Math.min(...services.map((s) => s.price))
                    : null;
                const currency = services[0]?.currency ?? "usd";
                return (
                  <div
                    className="coach-card"
                    key={coach.userId}
                    data-reveal={i % 3}
                  >
                    <div className="coach-card-top">
                      <div className="coach-id">
                        <Avatar name={coach.name} image={coach.image} size={40} />
                        <strong className="coach-name">{coach.name}</strong>
                      </div>
                      {rating ? (
                        <span className="stars" title={`${rating.avg.toFixed(1)}/5`}>
                          ★ {rating.avg.toFixed(1)}{" "}
                          <span className="muted">({rating.count})</span>
                        </span>
                      ) : (
                        <span className="badge-new">new</span>
                      )}
                    </div>
                    <div className="coach-games">{coach.games.join(" · ")}</div>
                    {coach.bio && <p className="coach-bio">{coach.bio}</p>}
                    <div className="coach-card-foot">
                      <span className="coach-price">
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
                            ? `/dashboard/coaches/${coach.userId}`
                            : `/signin?callbackUrl=/dashboard/coaches/${coach.userId}`
                        }
                        prefetch={false}
                      >
                        {signedIn ? "view & book" : "sign in to book"}
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
          ⚡ {siteName} — {copy["footer.tagline"]}
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
