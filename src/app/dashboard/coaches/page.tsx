import { requirePageUser } from "@/lib/page-auth";
import { listCoaches } from "@/server/db/repos/coachProfiles";
import { listServicesByCoach } from "@/server/db/repos/services";
import { formatMoney } from "@/lib/money";

export default async function CoachesPage() {
  await requirePageUser();
  const coaches = await listCoaches();
  const withServices = await Promise.all(
    coaches.map(async (coach) => ({
      coach,
      services: await listServicesByCoach(coach.userId, { activeOnly: true }),
    })),
  );

  return (
    <>
      <h1 className="page">Browse coaches</h1>
      <p className="sub">{coaches.length} coaches available.</p>

      <div style={{ display: "grid", gap: "1rem" }}>
        {withServices.map(({ coach, services }) => (
          <div className="card" key={coach.userId}>
            <strong>{coach.name}</strong>
            <div className="muted" style={{ fontSize: "0.85rem" }}>
              {coach.games.join(" · ")}
            </div>
            {coach.bio && (
              <p className="muted" style={{ marginTop: "0.5rem" }}>
                {coach.bio}
              </p>
            )}
            <table className="t" style={{ marginTop: "0.75rem" }}>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Duration</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                    <td>{s.title}</td>
                    <td>{s.durationMin} min</td>
                    <td>{formatMoney(s.price, s.currency)}</td>
                  </tr>
                ))}
                {services.length === 0 && (
                  <tr>
                    <td colSpan={3} className="muted">
                      No active services.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
        {coaches.length === 0 && (
          <div className="card muted">No coaches yet.</div>
        )}
      </div>
    </>
  );
}
