"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/guards";
import {
  createBooking,
  deleteBooking,
  getBookingDiscordInfo,
  setBookingDiscordChannel,
  setBookingTimes,
} from "@/server/db/repos/bookings";
import { getAnyActiveService } from "@/server/db/repos/services";
import { getUserById } from "@/server/db/repos/users";
import { deleteSetting, getSetting, setSetting } from "@/server/db/repos/settings";
import { isDiscordConfigured } from "@/server/discord/client";
import {
  cleanupSessionVoice,
  deleteSessionChannels,
  provisionSessionChannel,
  startSession,
} from "@/server/discord/provisioning";

import { DEMO_BOOKING_KEY } from "@/lib/discord-demo";

function back(result: string): never {
  redirect(`/dashboard/admin/discord?result=${encodeURIComponent(result)}`);
}

async function requireDemoReady(): Promise<void> {
  await requireRole("admin");
  if (!isDiscordConfigured()) back("err:Discord bot is not configured.");
}

/** Step 1 — create a throwaway confirmed booking (current admin as coach)
 * and provision its channel, exactly like payment fulfillment would. */
export async function demoProvision(formData: FormData): Promise<void> {
  await requireDemoReady();
  const adminUser = await requireRole("admin");

  if (await getSetting(DEMO_BOOKING_KEY)) {
    back("err:A demo booking already exists — reset it first.");
  }

  const clientUserId = String(formData.get("clientUserId") ?? "");
  const client = clientUserId ? await getUserById(clientUserId) : undefined;
  if (!client) back("err:Pick a demo client.");

  const coach = await getUserById(adminUser.id);
  if (!coach?.discordId) {
    back("err:Your account has no Discord id — sign out and back in.");
  }

  const service = await getAnyActiveService();
  if (!service) back("err:Create at least one active service first.");

  // Far enough out that the briefing reads naturally; step 2 moves it to now.
  const startAt = new Date(Date.now() + 60 * 60 * 1000);
  const endAt = new Date(startAt.getTime() + service.durationMin * 60 * 1000);

  const booking = await createBooking({
    clientId: client.id,
    coachId: coach.id,
    serviceId: service.id,
    startAt,
    endAt,
    status: "confirmed",
  });
  await setSetting(DEMO_BOOKING_KEY, booking.id);

  let error: string | null = null;
  try {
    const info = (await getBookingDiscordInfo(booking.id))!;
    const { channelId } = await provisionSessionChannel(info);
    await setBookingDiscordChannel(booking.id, channelId);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  if (error) back(`err:Provisioning failed: ${error}`);

  revalidatePath("/dashboard/admin/discord");
  back(
    "ok:Channel created — check Discord for the briefing message and the " +
      "add-client button.",
  );
}

/** Step 2 — pull the session time up to "now" and run the kickoff. */
export async function demoStartSession(): Promise<void> {
  await requireDemoReady();

  const bookingId = await getSetting(DEMO_BOOKING_KEY);
  const booking = bookingId ? await getBookingDiscordInfo(bookingId) : null;
  if (!booking?.discordChannelId) back("err:Run step 1 first.");

  await setBookingTimes(
    booking.id,
    new Date(),
    new Date(Date.now() + 30 * 60 * 1000),
  );

  let error: string | null = null;
  try {
    await startSession((await getBookingDiscordInfo(booking.id))!);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  if (error) back(`err:Session start failed: ${error}`);

  revalidatePath("/dashboard/admin/discord");
  back(
    "ok:Session started — both participants were pinged and the voice " +
      "channel is up.",
  );
}

/** Step 3 — run the wrap-up: delete the voice channel, keep the text one. */
export async function demoCleanup(): Promise<void> {
  await requireDemoReady();

  const bookingId = await getSetting(DEMO_BOOKING_KEY);
  const booking = bookingId ? await getBookingDiscordInfo(bookingId) : null;
  if (!booking?.discordVoiceChannelId) back("err:Run step 2 first.");

  let error: string | null = null;
  try {
    await cleanupSessionVoice(booking, { force: true });
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  if (error) back(`err:Cleanup failed: ${error}`);

  revalidatePath("/dashboard/admin/discord");
  back("ok:Voice channel closed and the wrap-up message posted.");
}

/** Tear everything down: both channels + the throwaway booking row. */
export async function demoReset(): Promise<void> {
  await requireDemoReady();

  const bookingId = await getSetting(DEMO_BOOKING_KEY);
  if (bookingId) {
    const booking = await getBookingDiscordInfo(bookingId);
    if (booking) {
      try {
        await deleteSessionChannels(booking);
      } catch {
        /* bot may lack access — booking cleanup still proceeds */
      }
      await deleteBooking(bookingId);
    }
    await deleteSetting(DEMO_BOOKING_KEY);
  }

  revalidatePath("/dashboard/admin/discord");
  back("ok:Demo torn down — channels and the throwaway booking are gone.");
}
