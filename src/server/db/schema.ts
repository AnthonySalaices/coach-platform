import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ── shared column helpers ────────────────────────────────────────────────────
const pk = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ── enums ─────────────────────────────────────────────────────────────────────
export const userRole = pgEnum("user_role", ["client", "coach", "admin"]);
export const bookingStatus = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "refunded",
]);
export const paymentStatus = pgEnum("payment_status", [
  "requires_payment",
  "processing",
  "succeeded",
  "failed",
  "refunded",
  "partially_refunded",
]);
export const jobStatus = pgEnum("job_status", [
  "pending",
  "running",
  "done",
  "failed",
]);

// ── Auth.js (@auth/drizzle-adapter) tables ───────────────────────────────────
// Column names/shapes follow the adapter's expectations; `users` is extended
// with our app-specific `role` + `discordId` and timestamps.
export const users = pgTable("users", {
  id: pk(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true, mode: "date" }),
  image: text("image"), // avatar URL (from Discord)
  // App fields:
  role: userRole("role").notNull().default("client"),
  discordId: text("discord_id").unique(),
  ...timestamps,
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("sessions", {
  // Present for adapter completeness; unused under the JWT session strategy.
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// ── domain tables ─────────────────────────────────────────────────────────────
export const coachProfiles = pgTable("coach_profiles", {
  id: pk(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  games: jsonb("games").$type<string[]>().notNull().default([]),
  showcaseLinks: jsonb("showcase_links")
    .$type<string[]>()
    .notNull()
    .default([]),
  defaultCurrency: text("default_currency").notNull().default("usd"),
  ...timestamps,
});

export const services = pgTable("services", {
  id: pk(),
  coachId: text("coach_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  durationMin: integer("duration_min").notNull(),
  // Price in minor units (e.g. cents). Never store money as a float.
  price: integer("price").notNull(),
  currency: text("currency").notNull().default("usd"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

// Availability is intentionally flexible — the scheduling logic is owned
// elsewhere. Each row is either a recurring rule or a one-off exception, with
// the actual rule shape kept in JSON.
export const availabilityType = pgEnum("availability_type", [
  "recurring",
  "exception",
]);

export const availability = pgTable("availability", {
  id: pk(),
  coachId: text("coach_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: availabilityType("type").notNull(),
  rule: jsonb("rule").$type<Record<string, unknown>>().notNull().default({}),
  startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }),
  endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }),
  ...timestamps,
});

export const bookings = pgTable(
  "bookings",
  {
    id: pk(),
    clientId: text("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    coachId: text("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    startAt: timestamp("start_at", { withTimezone: true, mode: "date" }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true, mode: "date" }).notNull(),
    status: bookingStatus("status").notNull().default("pending"),
    // The join key the Stripe webhook uses to find this booking idempotently.
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    discordChannelId: text("discord_channel_id"),
    ...timestamps,
  },
  (b) => [
    uniqueIndex("bookings_payment_intent_idx").on(b.stripePaymentIntentId),
  ],
);

export const payments = pgTable("payments", {
  id: pk(),
  bookingId: text("booking_id")
    .notNull()
    .unique()
    .references(() => bookings.id, { onDelete: "cascade" }),
  paymentIntentId: text("payment_intent_id").notNull().unique(),
  amount: integer("amount").notNull(), // minor units
  currency: text("currency").notNull(),
  status: paymentStatus("status").notNull().default("requires_payment"),
  refundedAmount: integer("refunded_amount").notNull().default(0),
  ...timestamps,
});

// Client reviews of a completed session. One per booking.
export const reviews = pgTable("reviews", {
  id: pk(),
  bookingId: text("booking_id")
    .notNull()
    .unique()
    .references(() => bookings.id, { onDelete: "cascade" }),
  clientId: text("client_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  coachId: text("coach_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1..5
  comment: text("comment"),
  ...timestamps,
});

// Idempotency ledger: a Stripe event id is recorded here BEFORE its side
// effects run, so replays/duplicates are no-ops.
export const processedStripeEvents = pgTable("processed_stripe_events", {
  eventId: text("event_id").primaryKey(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

// Editable app settings (key/value), e.g. the site name.
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// DB-backed job queue (no Redis). Workers claim rows with
// `FOR UPDATE SKIP LOCKED`, so multiple app instances are safe.
export const jobs = pgTable("jobs", {
  id: pk(),
  type: text("type").notNull(),
  payload: jsonb("payload")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  status: jobStatus("status").notNull().default("pending"),
  runAt: timestamp("run_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  lockedAt: timestamp("locked_at", { withTimezone: true, mode: "date" }),
  lastError: text("last_error"),
  ...timestamps,
});

// ── inferred types (used by repos + the rest of the app) ─────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type CoachProfile = typeof coachProfiles.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Availability = typeof availability.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Role = (typeof userRole.enumValues)[number];
export type BookingStatus = (typeof bookingStatus.enumValues)[number];
export type PaymentStatusValue = (typeof paymentStatus.enumValues)[number];
