import Link from "next/link";
import { requirePageUser } from "@/lib/page-auth";
import { listCoaches } from "@/server/db/repos/coachProfiles";
import { getCoachRatings } from "@/server/db/repos/reviews";
import { Avatar } from "@/components/Avatar";

export default async function CoachesPage() {
  await requirePageUser();
  const coaches = await listCoaches();
  const ratings = await getCoachRatings(coaches.map((c) => c.userId));

  return (
    <>
      <h1 className="page">Browse coaches</h1>
      <p className="sub">{coaches.length} coaches available.</p>

      <div className="coach-grid">
        {coaches.map((c) => {
          const r = ratings.get(c.userId);
          return (
            <Link
              className="coach-card"
              key={c.userId}
              href={`/dashboard/coaches/${c.userId}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="coach-card-top">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    minWidth: 0,
                  }}
                >
                  <Avatar name={c.name} image={c.image} size={40} />
                  <strong
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.name}
                  </strong>
                </div>
                {r ? (
                  <span className="stars">★ {r.avg.toFixed(1)}</span>
                ) : (
                  <span className="muted" style={{ fontSize: "0.78rem" }}>
                    New
                  </span>
                )}
              </div>
              <div className="coach-games">{c.games.join(" · ")}</div>
              {c.bio && <p className="coach-bio">{c.bio}</p>}
              <div className="coach-card-foot">
                <span className="muted" style={{ fontSize: "0.85rem" }}>
                  View profile &amp; book →
                </span>
              </div>
            </Link>
          );
        })}
        {coaches.length === 0 && (
          <div className="card muted">No coaches yet.</div>
        )}
      </div>
    </>
  );
}
