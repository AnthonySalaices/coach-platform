import { eq } from "drizzle-orm";
import { db } from "../index";
import {
  bookings,
  type Booking,
  type BookingStatus,
  type NewBooking,
} from "../schema";

export async function getBookingById(id: string): Promise<Booking | undefined> {
  const [row] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);
  return row;
}

/** The webhook's idempotent join: locate the booking a Stripe event refers to. */
export async function getBookingByPaymentIntentId(
  paymentIntentId: string,
): Promise<Booking | undefined> {
  const [row] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.stripePaymentIntentId, paymentIntentId))
    .limit(1);
  return row;
}

export async function createBooking(input: NewBooking): Promise<Booking> {
  const [row] = await db.insert(bookings).values(input).returning();
  return row!;
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<void> {
  await db.update(bookings).set({ status }).where(eq(bookings.id, id));
}

export async function attachPaymentIntent(
  id: string,
  stripePaymentIntentId: string,
): Promise<void> {
  await db
    .update(bookings)
    .set({ stripePaymentIntentId })
    .where(eq(bookings.id, id));
}

export async function setBookingDiscordChannel(
  id: string,
  discordChannelId: string,
): Promise<void> {
  await db
    .update(bookings)
    .set({ discordChannelId })
    .where(eq(bookings.id, id));
}
