import Link from "next/link";
import { notFound } from "next/navigation";
import { getIdentity } from "@/lib/page-auth";
import { getBookingDetailById } from "@/server/db/repos/bookings";
import { LocalTime } from "@/components/LocalTime";
import { formatMoney } from "@/lib/money";

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { user } = await getIdentity();
  const { id } = await params;
  const { status: returnStatus } = await searchParams;

  const booking = await getBookingDetailById(id);
  if (!booking) notFound();

  // Authorization: admins anything; the booking's client; the assigned coach.
  // Otherwise pretend it doesn't exist (don't leak that the id is valid).
  const canAccess =
    user.role === "admin" ||
    user.id === booking.clientId ||
    (user.role === "coach" && user.id === booking.coachId);
  if (!canAccess) notFound();

  const banner =
    returnStatus === "success"
      ? { kind: "ok", text: "Payment received — you're booked! 🎮" }
      : returnStatus === "simulated"
        ? { kind: "ok", text: "Booking confirmed (dev mode — no real charge)." }
        : returnStatus === "cancelled"
          ? {
              kind: "warn",
              text: "Checkout was cancelled — this booking is still pending payment.",
            }
          : null;

  return (
    <>
      <p style={{ margin: "0 0 0.5rem" }}>
        <Link href="/dashboard/client" className="muted">
          ← Back to my bookings
        </Link>
      </p>
      <h1 className="page">Booking</h1>

      {banner && (
        <div
          className="card"
          style={{
            marginBottom: "1rem",
            borderColor: banner.kind === "ok" ? "#1f5740" : "#6b5417",
            color: banner.kind === "ok" ? "#45c08a" : "#f0b429",
          }}
        >
          {banner.text}
        </div>
      )}

      <div className="card" style={{ maxWidth: 560 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <strong style={{ fontSize: "1.1rem" }}>{booking.serviceTitle}</strong>
          <span className={`badge ${booking.status}`}>{booking.status}</span>
        </div>

        <dl className="kv">
          <dt>When</dt>
          <dd>
            <LocalTime value={booking.startAt.toISOString()} mode="full" />
          </dd>
          <dt>Coach</dt>
          <dd>{booking.coachName ?? "—"}</dd>
          <dt>Client</dt>
          <dd>{booking.clientName ?? "—"}</dd>
          <dt>Price</dt>
          <dd>{formatMoney(booking.price, booking.currency)}</dd>
          <dt>Payment</dt>
          <dd>
            {booking.paymentStatus ?? "—"}
            {booking.refundedAmount ? (
              <span className="muted">
                {" "}
                · refunded{" "}
                {formatMoney(booking.refundedAmount, booking.currency)}
              </span>
            ) : null}
          </dd>
          <dt>Discord</dt>
          <dd>
            {booking.discordChannelId ? (
              <span className="muted">channel #{booking.discordChannelId}</span>
            ) : (
              <span className="muted">
                provisioned after payment (when the bot is configured)
              </span>
            )}
          </dd>
        </dl>
      </div>
    </>
  );
}
