import { eq } from "drizzle-orm";
import { db } from "../index";
import { payments, type Payment, type PaymentStatusValue } from "../schema";

export async function getPaymentByIntentId(
  paymentIntentId: string,
): Promise<Payment | undefined> {
  const [row] = await db
    .select()
    .from(payments)
    .where(eq(payments.paymentIntentId, paymentIntentId))
    .limit(1);
  return row;
}

export async function upsertPaymentForBooking(input: {
  bookingId: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: PaymentStatusValue;
}): Promise<Payment> {
  const [row] = await db
    .insert(payments)
    .values(input)
    .onConflictDoUpdate({
      target: payments.bookingId,
      set: {
        paymentIntentId: input.paymentIntentId,
        amount: input.amount,
        currency: input.currency,
        status: input.status,
      },
    })
    .returning();
  return row!;
}

export async function recordRefund(input: {
  paymentIntentId: string;
  refundedAmount: number;
  status: PaymentStatusValue;
}): Promise<void> {
  await db
    .update(payments)
    .set({ refundedAmount: input.refundedAmount, status: input.status })
    .where(eq(payments.paymentIntentId, input.paymentIntentId));
}
