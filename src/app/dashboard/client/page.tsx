import { requirePageRole } from "@/lib/page-auth";
import { listBookingsDetailed } from "@/server/db/repos/bookings";
import { listReviewsByClient } from "@/server/db/repos/reviews";
import { fmtDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { leaveReview } from "./actions";

const UPCOMING = new Set(["pending", "confirmed"]);

export default async function ClientPage() {
  const user = await requirePageRole("client", "admin");
  const [bookings, reviews] = await Promise.all([
    listBookingsDetailed({ clientId: user.id }),
    listReviewsByClient(user.id),
  ]);
  const reviewByBooking = new Map(reviews.map((r) => [r.bookingId, r]));
  const upcoming = bookings.filter((b) => UPCOMING.has(b.status));
  const past = bookings.filter((b) => !UPCOMING.has(b.status));

  return (
    <>
      <h1 className="page">My bookings</h1>
      <p className="sub">Your upcoming sessions, history, and reviews.</p>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <strong>Upcoming</strong>
        <table className="t" style={{ marginTop: "0.5rem" }}>
          <thead>
            <tr>
              <th>When</th>
              <th>Coach</th>
              <th>Service</th>
              <th>Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map((b) => (
              <tr key={b.id}>
                <td>{fmtDateTime(b.startAt)}</td>
                <td>{b.coachName ?? "—"}</td>
                <td>{b.serviceTitle}</td>
                <td>{formatMoney(b.price, b.currency)}</td>
                <td>
                  <span className={`badge ${b.status}`}>{b.status}</span>
                </td>
              </tr>
            ))}
            {upcoming.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No upcoming sessions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <strong>Past sessions</strong>
        <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.6rem" }}>
          {past.map((b) => {
            const review = reviewByBooking.get(b.id);
            return (
              <div
                key={b.id}
                style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: "0.6rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <strong>{b.serviceTitle}</strong>{" "}
                    <span className="muted">with {b.coachName}</span>
                    <div className="muted" style={{ fontSize: "0.82rem" }}>
                      {fmtDateTime(b.startAt)}
                    </div>
                  </div>
                  <span className={`badge ${b.status}`}>{b.status}</span>
                </div>

                {b.status === "completed" &&
                  (review ? (
                    <div style={{ marginTop: "0.5rem" }}>
                      <Stars n={review.rating} />
                      {review.comment && (
                        <span className="muted"> — {review.comment}</span>
                      )}
                    </div>
                  ) : (
                    <form
                      action={leaveReview}
                      style={{ marginTop: "0.5rem" }}
                    >
                      <input type="hidden" name="bookingId" value={b.id} />
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <select
                          name="rating"
                          className="input"
                          defaultValue="5"
                          style={{ width: "auto" }}
                        >
                          <option value="5">★★★★★</option>
                          <option value="4">★★★★</option>
                          <option value="3">★★★</option>
                          <option value="2">★★</option>
                          <option value="1">★</option>
                        </select>
                        <input
                          name="comment"
                          className="input"
                          placeholder="Leave a comment (optional)"
                          style={{ flex: 1, minWidth: "180px" }}
                        />
                        <button className="btn" type="submit">
                          Submit review
                        </button>
                      </div>
                    </form>
                  ))}
              </div>
            );
          })}
          {past.length === 0 && (
            <p className="muted">No past sessions yet.</p>
          )}
        </div>
      </div>
    </>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: "#f0b429" }} title={`${n}/5`}>
      {"★".repeat(n)}
      {"☆".repeat(5 - n)}
    </span>
  );
}
