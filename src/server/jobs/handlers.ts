import type { Job } from "@/server/db/schema";
import {
  getBookingDiscordInfo,
  setBookingDiscordChannel,
  type BookingDiscordInfo,
} from "@/server/db/repos/bookings";
import { isDiscordConfigured } from "@/server/discord/client";
import {
  cleanupSessionVoice,
  provisionSessionChannel,
  startSession,
} from "@/server/discord/provisioning";
import { enqueue } from "./queue";

export type JobHandler = (job: Job) => Promise<void>;

// Delete the session voice channel this long after the booked end time (and
// keep waiting in same-size increments while people are still connected,
// up to the hard cap).
const VOICE_CLEANUP_GRACE_MS = 30 * 60 * 1000;
const VOICE_CLEANUP_HARD_CAP_MS = 6 * 60 * 60 * 1000;

/** Common guard: load the booking for a Discord job, or explain the skip. */
async function bookingForDiscordJob(
  job: Job,
): Promise<BookingDiscordInfo | null> {
  const bookingId = String(job.payload.bookingId ?? "");
  if (!bookingId) return null;
  if (!isDiscordConfigured()) {
    console.log(
      `[jobs] ${job.type}: Discord not configured — skipping booking ${bookingId}`,
    );
    return null;
  }
  const booking = await getBookingDiscordInfo(bookingId);
  if (!booking) return null;
  return booking;
}

/**
 * Registry of job type → handler. New handlers land here as features are built.
 * A `noop` is kept so the queue is exercisable in isolation.
 */
const handlers: Record<string, JobHandler> = {
  noop: async () => {},

  // Provision a private Discord channel for a confirmed booking (enqueued by
  // payment fulfillment), then schedule the session kickoff. No-ops cleanly
  // when Discord isn't configured, so the queue stays green without a bot.
  "discord.provisionChannel": async (job) => {
    const booking = await bookingForDiscordJob(job);
    if (!booking) return;
    if (booking.status !== "confirmed") return;

    if (!booking.discordChannelId) {
      const { channelId } = await provisionSessionChannel(booking);
      await setBookingDiscordChannel(booking.id, channelId);
    }

    // Kick off the session on time (idempotent: sessionStart re-checks state).
    await enqueue(
      "discord.sessionStart",
      { bookingId: booking.id },
      { runAt: booking.startAt },
    );
  },

  // At start time: let the client into the text channel, open the private
  // voice channel, ping both participants, and schedule cleanup.
  "discord.sessionStart": async (job) => {
    const booking = await bookingForDiscordJob(job);
    if (!booking) return;
    if (booking.status === "cancelled" || booking.status === "refunded")
      return;
    if (Date.now() > booking.endAt.getTime()) return; // missed the window
    if (!booking.discordChannelId) return; // never provisioned

    await startSession(booking);

    await enqueue(
      "discord.sessionEnd",
      { bookingId: booking.id },
      { runAt: new Date(booking.endAt.getTime() + VOICE_CLEANUP_GRACE_MS) },
    );
  },

  // After the session: tear down the voice channel. If someone is still in
  // it, push the cleanup back — but never past the hard cap.
  "discord.sessionEnd": async (job) => {
    const booking = await bookingForDiscordJob(job);
    if (!booking) return;

    const pastHardCap =
      Date.now() > booking.endAt.getTime() + VOICE_CLEANUP_HARD_CAP_MS;
    const result = await cleanupSessionVoice(booking, { force: pastHardCap });
    if (result === "retry") {
      await enqueue(
        "discord.sessionEnd",
        { bookingId: booking.id },
        { runAt: new Date(Date.now() + VOICE_CLEANUP_GRACE_MS) },
      );
    }
  },
};

export async function runHandler(job: Job): Promise<void> {
  const handler = handlers[job.type];
  if (!handler) {
    throw new Error(`No handler registered for job type "${job.type}".`);
  }
  await handler(job);
}
