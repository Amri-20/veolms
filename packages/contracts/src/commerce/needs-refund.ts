import { z } from "zod";

/**
 * Money that staff have to return by hand: `GET /orders/needs-refund`
 * (requires `billing.read`, as the admin orders list does).
 *
 * Nothing on this list is refunded automatically and no access changes
 * because of it. An entry leaves the list once the money is back: a surplus
 * payment when the gateway has reported refunds covering all of it, a
 * duplicate purchase when either order has been refunded in full or the
 * later one has been refunded at least what it charged for the course.
 *
 * Every amount is in MINOR units (paise), like every other order response.
 */

/** The buyer, as staff need them to recognise the person and write to them. */
export const needsRefundBuyerSchema = z.strictObject({
  name: z.string(),
  email: z.string().nullable(),
  /** For linking to the student's profile. Null when the account is gone. */
  username: z.string().nullable(),
});
export type NeedsRefundBuyer = z.infer<typeof needsRefundBuyerSchema>;

export const needsRefundOrderRefSchema = z.strictObject({
  id: z.uuid(),
  orderNumber: z.string(),
});
export type NeedsRefundOrderRef = z.infer<typeof needsRefundOrderRefSchema>;

const needsRefundMoneyFields = {
  /** What was paid, in minor units. */
  amount: z.number().int().nonnegative(),
  /** How much of it has already been returned, in minor units. */
  refundedAmount: z.number().int().nonnegative(),
  currency: z.string().length(3),
  /** `razorpay`, `manual`, ... as stored on the payment. */
  gatewayProvider: z.string().nullable(),
  /** The gateway's own id for the payment: what to look up to refund it. */
  gatewayPaymentId: z.string().nullable(),
  /** When the money was taken. */
  paidAt: z.string().or(z.date()),
};

/**
 * A gateway payment captured for an order that had already been paid another
 * way (staff verified a manual transfer and the buyer then also completed
 * the gateway payment). Nothing was granted for it. It can only be returned
 * from the gateway's dashboard; the gateway's refund events then take it off
 * this list.
 */
export const surplusPaymentNeedsRefundSchema = z.strictObject({
  kind: z.literal("surplus_payment"),
  /** The payment row's id. */
  id: z.uuid(),
  buyer: needsRefundBuyerSchema,
  /** What the order was for: its item titles, joined. */
  courseTitle: z.string(),
  /** The order the payment arrived for. It is paid, and stays as it is. */
  order: needsRefundOrderRefSchema,
  ...needsRefundMoneyFields,
});
export type SurplusPaymentNeedsRefund = z.infer<
  typeof surplusPaymentNeedsRefundSchema
>;

/**
 * A buyer holding two paid orders that each contain the same course as a
 * course item (a course inside a bundle is not compared), where the later
 * one was already open when the earlier one was paid. Buying a course again
 * after access to it ran out is not listed. `order` is the one paid later:
 * the one to refund. `amount` is what that order charged for the course,
 * and `refundedAmount` is everything already refunded on that order.
 */
export const duplicatePurchaseNeedsRefundSchema = z.strictObject({
  kind: z.literal("duplicate_purchase"),
  /** The later order's item for the course. */
  id: z.uuid(),
  buyer: needsRefundBuyerSchema,
  courseTitle: z.string(),
  courseId: z.uuid(),
  /** The later-paid order: refund this one. */
  order: needsRefundOrderRefSchema,
  /** What the later order cost in all, in minor units. */
  orderTotalAmount: z.number().int().nonnegative(),
  /** The order the buyer already held when the later one was paid. */
  earlierOrder: needsRefundOrderRefSchema.extend({
    /** What it charged for the course, in minor units. */
    amount: z.number().int().nonnegative(),
    paidAt: z.string().or(z.date()),
  }),
  ...needsRefundMoneyFields,
});
export type DuplicatePurchaseNeedsRefund = z.infer<
  typeof duplicatePurchaseNeedsRefundSchema
>;

export const needsRefundEntrySchema = z.discriminatedUnion("kind", [
  surplusPaymentNeedsRefundSchema,
  duplicatePurchaseNeedsRefundSchema,
]);
export type NeedsRefundEntry = z.infer<typeof needsRefundEntrySchema>;

export const needsRefundListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type NeedsRefundListQueryInput = z.input<
  typeof needsRefundListQuerySchema
>;
export type NeedsRefundListQuery = z.output<typeof needsRefundListQuerySchema>;

/** Newest first by `paidAt`. `nextCursor` is null on the last page. */
export const needsRefundListResponseSchema = z.strictObject({
  entries: z.array(needsRefundEntrySchema),
  nextCursor: z.string().nullable(),
});
export type NeedsRefundListResponse = z.infer<
  typeof needsRefundListResponseSchema
>;
