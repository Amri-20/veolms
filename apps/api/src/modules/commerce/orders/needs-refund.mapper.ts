import type {
  DuplicatePurchaseNeedsRefund,
  ManualTransferForPaidOrderNeedsRefund,
  NeedsRefundBuyer,
  SurplusPaymentNeedsRefund,
} from "@veolms/contracts";
import { refundedSoFar } from "../payments/surplus-payment.ts";
import { toMinorUnits } from "../shared/currency.ts";
import type {
  DuplicatePurchaseRow,
  ManualTransferForPaidOrderRow,
  SurplusPaymentToReturnRow,
} from "./needs-refund.repository.ts";

/**
 * Rows of the "needs a manual refund" list as the staff screen receives
 * them. Every amount leaves in MINOR units: payments and refunds are stored
 * that way, and the order and item columns (major units) are converted here
 * and nowhere else, as order.mapper.ts does for order responses.
 */

interface BuyerRowLike {
  display_name: string;
  username: string;
  email: string | null;
}

/** A buyer whose account row is gone still has to be shown as someone. */
export function toNeedsRefundBuyer(user?: BuyerRowLike): NeedsRefundBuyer {
  return {
    name: user?.display_name || user?.username || "Student",
    email: user?.email ?? null,
    username: user?.username ?? null,
  };
}

export function toSurplusPaymentEntry(
  row: SurplusPaymentToReturnRow,
  user?: BuyerRowLike,
): SurplusPaymentNeedsRefund {
  return {
    kind: "surplus_payment",
    id: row.id,
    buyer: toNeedsRefundBuyer(user),
    courseTitle: row.item_titles ?? "",
    order: { id: row.order_id, orderNumber: row.order_number },
    amount: row.amount,
    // Part refunds are noted on the payment row; it only leaves the list
    // (becomes `refunded`) when they cover the whole amount.
    refundedAmount: Math.min(refundedSoFar(row.error_description), row.amount),
    currency: row.currency,
    gatewayProvider: row.gateway_provider,
    gatewayPaymentId: row.gateway_payment_id,
    paidAt: row.paid_at,
  };
}

export function toDuplicatePurchaseEntry(
  row: DuplicatePurchaseRow,
  user?: BuyerRowLike,
): DuplicatePurchaseNeedsRefund {
  return {
    kind: "duplicate_purchase",
    id: row.id,
    buyer: toNeedsRefundBuyer(user),
    courseTitle: row.title_snapshot,
    courseId: row.course_id,
    order: { id: row.order_id, orderNumber: row.order_number },
    orderTotalAmount: toMinorUnits(row.total_amount, row.currency),
    earlierOrder: {
      id: row.earlier_order_id,
      orderNumber: row.earlier_order_number,
      amount: toMinorUnits(row.earlier_final_amount, row.currency),
      paidAt: row.earlier_paid_at,
    },
    amount: toMinorUnits(row.final_amount, row.currency),
    refundedAmount: Number(row.refunded_amount),
    currency: row.currency,
    gatewayProvider: row.gateway_provider,
    gatewayPaymentId: row.gateway_payment_id,
    paidAt: row.paid_at,
  };
}

export function toManualTransferForPaidOrderEntry(
  row: ManualTransferForPaidOrderRow,
  user?: BuyerRowLike,
): ManualTransferForPaidOrderNeedsRefund {
  return {
    kind: "manual_transfer_for_paid_order",
    id: row.id,
    buyer: toNeedsRefundBuyer(user),
    courseTitle: row.item_titles ?? "",
    order: { id: row.order_id, orderNumber: row.order_number },
    // A request carries no amount: the buyer was paying for the order.
    amount: toMinorUnits(row.total_amount, row.currency),
    currency: row.currency,
    paymentMethod: row.payment_method,
    transactionReference: row.transaction_reference,
    submittedAt: row.submitted_at,
  };
}

/**
 * Whether a duplicate purchase still has money to go back. It has until
 * the later order has been refunded what it charged for the course: in
 * full (a fully refunded order is not listed at all), by refunding that
 * item (not listed either), or by a part refund of at least that amount,
 * which is how the Orders screen returns one course of an order that holds
 * others. A smaller part refund leaves it listed, with what has gone back.
 */
export function isDuplicateStillOwed(
  row: Pick<
    DuplicatePurchaseRow,
    "final_amount" | "refunded_amount" | "currency"
  >,
): boolean {
  return (
    Number(row.refunded_amount) < toMinorUnits(row.final_amount, row.currency)
  );
}

/**
 * Newest first, by the same (time, id) pair the queries order and page by.
 * The time is Postgres text of fixed width and the ids are lower-case
 * UUIDs, so comparing them as strings is comparing them as Postgres does.
 */
export function compareNewestFirst(
  a: { paid_at_cursor: string; id: string },
  b: { paid_at_cursor: string; id: string },
): number {
  if (a.paid_at_cursor !== b.paid_at_cursor) {
    return a.paid_at_cursor < b.paid_at_cursor ? 1 : -1;
  }
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

/**
 * A cursor's time as the queries print theirs: six fractional digits. A
 * cursor is accepted with fewer, and the two are compared as text.
 */
export function toCursorTime(value: string): string {
  const [seconds = "", fraction = ""] = value.replace(/Z$/u, "").split(".");
  return `${seconds}.${fraction.padEnd(6, "0")}Z`;
}
