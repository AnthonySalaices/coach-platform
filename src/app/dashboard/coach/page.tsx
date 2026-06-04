import { requirePageRole } from "@/lib/page-auth";
import { getCoachProfileByUserId } from "@/server/db/repos/coachProfiles";
import { listServicesByCoach } from "@/server/db/repos/services";
import { listBookingsDetailed } from "@/server/db/repos/bookings";
import { BookingsTable } from "@/components/BookingsTable";
import { formatMoney } from "@/lib/money";
import { updateCoachProfile } from "./actions";

export default async function CoachPage() {
  const user = await requirePageRole("coach", "admin");
  const [profile, services, bookings] = await Promise.all([
    getCoachProfileByUserId(user.id),
    listServicesByCoach(user.id),
    listBookingsDetailed({ coachId: user.id }),
  ]);

  return (
    <>
      <h1 className="page">My coaching</h1>
      <p className="sub">
        {profile
          ? profile.games.join(" · ") || "Your coaching profile"
          : "You don't have a coach profile yet."}
      </p>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <strong>Edit profile</strong>
        <form action={updateCoachProfile} className="form" style={{ marginTop: "0.6rem" }}>
          <label>
            Bio
            <textarea
              name="bio"
              className="input"
              rows={3}
              placeholder="Tell clients who you are and how you coach…"
              defaultValue={profile?.bio ?? ""}
            />
          </label>
          <label>
            Games <span className="muted">(comma-separated)</span>
            <input
              name="games"
              className="input"
              placeholder="Valorant, League of Legends"
              defaultValue={(profile?.games ?? []).join(", ")}
            />
          </label>
          <div>
            <button className="btn" type="submit">
              Save profile
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <strong>Services</strong>
        <table className="t" style={{ marginTop: "0.5rem" }}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Duration</th>
              <th>Price</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td>{s.title}</td>
                <td>{s.durationMin} min</td>
                <td>{formatMoney(s.price, s.currency)}</td>
                <td>{s.active ? "Yes" : "No"}</td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  No services yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <strong>Sessions</strong>
        <div style={{ marginTop: "0.5rem" }}>
          <BookingsTable rows={bookings} columns={{ client: true }} />
        </div>
      </div>
    </>
  );
}
