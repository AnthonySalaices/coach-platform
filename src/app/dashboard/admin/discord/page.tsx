import { env } from "@/env";
import { requirePageRole } from "@/lib/page-auth";
import { DEMO_BOOKING_KEY } from "@/lib/discord-demo";
import { getSetting } from "@/server/db/repos/settings";
import { getBookingDiscordInfo } from "@/server/db/repos/bookings";
import { listUsers } from "@/server/db/repos/users";
import { isDiscordConfigured } from "@/server/discord/client";
import {
  demoCleanup,
  demoProvision,
  demoReset,
  demoStartSession,
} from "./actions";

export const metadata = { title: "Discord bot" };

function channelLink(channelId: string): string {
  return `https://discord.com/channels/${env.DISCORD_GUILD_ID}/${channelId}`;
}

export default async function AdminDiscordPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const admin = await requirePageRole("admin");
  const { result } = await searchParams;
  const configured = isDiscordConfigured();

  const demoBookingId = configured ? await getSetting(DEMO_BOOKING_KEY) : null;
  const demo = demoBookingId
    ? await getBookingDiscordInfo(demoBookingId)
    : null;
  const users = configured ? await listUsers() : [];

  const message = result?.startsWith("ok:") ? result.slice(3) : null;
  const error = result?.startsWith("err:") ? result.slice(4) : null;

  const step1Done = Boolean(demo?.discordChannelId);
  const step2Done = Boolean(demo?.discordVoiceChannelId);

  return (
    <>
      <h1 className="page">Discord bot</h1>
      <p className="sub">
        Walk through the booking → session lifecycle with a throwaway booking
        (you play the coach). Watch your Discord server after each step.
      </p>

      {message && <p className="demo-banner ok">✓ {message}</p>}
      {error && <p className="demo-banner err">✗ {error}</p>}

      {!configured && (
        <div className="card" style={{ maxWidth: 640 }}>
          <strong>Bot not configured.</strong>
          <p className="muted" style={{ margin: "0.5rem 0 0" }}>
            Set <code>DISCORD_BOT_TOKEN</code> and <code>DISCORD_GUILD_ID</code>{" "}
            (see <code>.env.example</code>), restart, and come back.
          </p>
        </div>
      )}

      {configured && (
        <div className="demo-steps">
          <div className="card copy-card" style={{ maxWidth: 640 }}>
            <div className="copy-card-head">
              <strong>1 · Booking confirmed</strong>
              {step1Done && <span className="copy-saved">✓ done</span>}
            </div>
            <p className="muted demo-blurb">
              Creates a confirmed test booking (coach: you) and provisions the
              private session channel — in Discord you&apos;ll get the booking
              briefing with the &quot;add client&quot; button. In production
              this runs automatically when Stripe confirms payment.
            </p>
            {!demo ? (
              <form action={demoProvision} className="avail-form">
                <label className="avail-label" htmlFor="clientUserId">
                  demo client
                </label>
                <select
                  id="clientUserId"
                  name="clientUserId"
                  className="input"
                  defaultValue={admin.id}
                  style={{ width: "auto" }}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ?? u.email ?? u.id}
                      {u.id === admin.id ? " (you)" : ""}
                      {u.discordId ? "" : " — no Discord link"}
                    </option>
                  ))}
                </select>
                <button className="btn-primary" type="submit">
                  Create booking + channel
                </button>
              </form>
            ) : (
              <p className="demo-state">
                <span className="muted">channel:</span>{" "}
                {demo.discordChannelId ? (
                  <a
                    href={channelLink(demo.discordChannelId)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    open in Discord ↗
                  </a>
                ) : (
                  "—"
                )}
                {"  ·  "}
                <span className="muted">client:</span>{" "}
                {demo.clientName ?? "?"}
              </p>
            )}
          </div>

          <div className="card copy-card" style={{ maxWidth: 640 }}>
            <div className="copy-card-head">
              <strong>2 · Session starts</strong>
              {step2Done && <span className="copy-saved">✓ done</span>}
            </div>
            <p className="muted demo-blurb">
              Moves the booking&apos;s start time to now and runs the kickoff:
              the client joins the text channel, both of you get pinged, and
              the private voice channel appears. In production a scheduled job
              fires this at the booked start time.
            </p>
            <form action={demoStartSession}>
              <button
                className="btn-primary"
                type="submit"
                disabled={!step1Done}
              >
                Start session now
              </button>
            </form>
            {step2Done && demo?.discordVoiceChannelId && (
              <p className="demo-state">
                <span className="muted">voice:</span>{" "}
                <a
                  href={channelLink(demo.discordVoiceChannelId)}
                  target="_blank"
                  rel="noreferrer"
                >
                  open in Discord ↗
                </a>
              </p>
            )}
          </div>

          <div className="card copy-card" style={{ maxWidth: 640 }}>
            <div className="copy-card-head">
              <strong>3 · Session wraps up</strong>
            </div>
            <p className="muted demo-blurb">
              Deletes the voice channel and posts the wrap-up message; the text
              channel stays for follow-ups. In production this runs ~30 minutes
              after the booked end time, waiting for everyone to leave voice
              first.
            </p>
            <form action={demoCleanup}>
              <button
                className="btn-primary"
                type="submit"
                disabled={!step2Done}
              >
                Run cleanup
              </button>
            </form>
          </div>

          <div className="card copy-card" style={{ maxWidth: 640 }}>
            <div className="copy-card-head">
              <strong>Reset</strong>
            </div>
            <p className="muted demo-blurb">
              Deletes both demo channels and the throwaway booking so you can
              run the walkthrough again.
            </p>
            <form action={demoReset}>
              <button className="btn" type="submit" disabled={!demo}>
                Tear down demo
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
