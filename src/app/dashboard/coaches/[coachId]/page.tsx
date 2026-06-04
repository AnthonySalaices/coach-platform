import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/page-auth";
import { getUserById } from "@/server/db/repos/users";
import { getCoachProfileByUserId } from "@/server/db/repos/coachProfiles";
import { listServicesByCoach } from "@/server/db/repos/services";
import { getCoachRatings } from "@/server/db/repos/reviews";
import { availableSlotsForService } from "@/server/scheduling/slots";
import { formatMoney } from "@/lib/money";
import { Avatar } from "@/components/Avatar";
import { SlotPicker } from "@/components/SlotPicker";

const MAX_SLOTS = 24;

export default async function CoachProfilePage({
  params,
}: {
  params: Promise<{ coachId: string }>;
}) {
  const me = await requirePageUser();
  const { coachId } = await params;
  const coach = await getUserById(coachId);
  if (!coach || coach.role !== "coach") notFound();

  const [profile, services, ratings] = await Promise.all([
    getCoachProfileByUserId(coachId),
    listServicesByCoach(coachId, { activeOnly: true }),
    getCoachRatings([coachId]),
  ]);
  const rating = ratings.get(coachId);
  const canBook = me.role === "client" || me.role === "admin";

  const slotsByService = await Promise.all(
    services.map((s) => availableSlotsForService(coachId, s.durationMin)),
  );

  return (
    <>
      <p style={{ margin: "0 0 0.5rem" }}>
        <Link href="/dashboard/coaches" className="muted">
          ← All coaches
        </Link>
      </p>
      <div
        style={{ display: "flex", alignItems: "center", gap: "1rem" }}
      >
        <Avatar name={coach.name} image={coach.image} size={64} />
        <div>
          <h1 className="page" style={{ marginBottom: "0.15rem" }}>
            {coach.name}
          </h1>
          <p className="sub" style={{ margin: 0 }}>
            {(profile?.games ?? []).join(" · ")}
            {rating ? (
              <>
                {"  ·  "}
                <span className="stars">
                  ★ {rating.avg.toFixed(1)} ({rating.count})
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>
      <div style={{ height: "1rem" }} />

      {profile?.bio && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          {profile.bio}
        </div>
      )}

      {services.length === 0 && (
        <div className="card muted">No services offered yet.</div>
      )}

      <div style={{ display: "grid", gap: "1rem" }}>
        {services.map((s, i) => {
          const slots = slotsByService[i]!.slice(0, MAX_SLOTS);
          return (
            <div className="card" key={s.id}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <div>
                  <strong>{s.title}</strong>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {s.durationMin} min
                  </div>
                </div>
                <div style={{ fontWeight: 700 }}>
                  {formatMoney(s.price, s.currency)}
                </div>
              </div>
              {s.description && (
                <p className="muted" style={{ marginTop: "0.4rem" }}>
                  {s.description}
                </p>
              )}

              {!canBook ? (
                <p
                  className="muted"
                  style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}
                >
                  Sign in as a client to book.
                </p>
              ) : slots.length === 0 ? (
                <p
                  className="muted"
                  style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}
                >
                  No open times in the next two weeks.
                </p>
              ) : (
                <div style={{ marginTop: "0.5rem" }}>
                  <SlotPicker
                    serviceId={s.id}
                    slots={slots.map((slot) => slot.start.toISOString())}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
