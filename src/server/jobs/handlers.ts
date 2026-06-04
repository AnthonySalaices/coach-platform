import type { Job } from "@/server/db/schema";
import {
  getBookingById,
  setBookingDiscordChannel,
} from "@/server/db/repos/bookings";
import { isDiscordConfigured } from "@/server/discord/client";
import { provisionSessionChannel } from "@/server/discord/provisioning";

export type JobHandler = (job: Job) => Promise<void>;

/**
 * Registry of job type → handler. New handlers land here as features are built.
 * A `noop` is kept so the queue is exercisable in isolation.
 */
const handlers: Record<string, JobHandler> = {
  noop: async () => {},

  // Provision a private Discord channel for a confirmed booking. Enqueued by
  // payment fulfillment. No-ops cleanly when Discord isn't configured (e.g. the
  // bot token isn't set), so the queue stays green without a bot.
  "discord.provisionChannel": async (job) => {
    const bookingId = String(job.payload.bookingId ?? "");
    if (!bookingId) return;

    if (!isDiscordConfigured()) {
      console.log(
        `[jobs] discord.provisionChannel: Discord not configured — skipping booking ${bookingId}`,
      );
      return;
    }

    const booking = await getBookingById(bookingId);
    if (!booking || booking.discordChannelId) return; // gone or already done

    const { channelId } = await provisionSessionChannel(booking);
    await setBookingDiscordChannel(bookingId, channelId);
  },
};

export async function runHandler(job: Job): Promise<void> {
  const handler = handlers[job.type];
  if (!handler) {
    throw new Error(`No handler registered for job type "${job.type}".`);
  }
  await handler(job);
}
