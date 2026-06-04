import type { Booking } from "@/server/db/schema";

class NotImplemented extends Error {
  constructor(what: string) {
    super(`${what} is not implemented yet (Discord provisioning stub).`);
    this.name = "NotImplemented";
  }
}

/**
 * STUB. Real implementation will, via `getDiscordClient()`:
 *  - create a private text channel for the session in `DISCORD_GUILD_ID`,
 *  - grant the booking's client + coach access,
 *  - return the channel id to persist on `bookings.discord_channel_id`.
 * Intended to run from a background job after payment succeeds.
 */
export async function provisionSessionChannel(
  booking: Booking,
): Promise<{ channelId: string }> {
  void booking;
  throw new NotImplemented("provisionSessionChannel");
}

/** STUB. Real implementation will assign a Discord role to a member. */
export async function assignRole(
  userId: string,
  roleId: string,
): Promise<void> {
  void userId;
  void roleId;
  throw new NotImplemented("assignRole");
}
