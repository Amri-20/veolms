import type { NeedsRefundEntry } from "@veolms/contracts";
import { formatCurrency, formatOrderDate } from "./orderHelpers";

/**
 * The words the Orders screen shows for one payment that staff have to
 * refund by hand. Kept apart from the component, and free of React, so the
 * wording for each kind of entry can be read and replayed on its own.
 */
export interface NeedsRefundLines {
  buyerName: string;
  buyerEmail: string | null;
  courseTitle: string;
  /** What has to go back, formatted: "₹600". */
  amount: string;
  /** "₹100 already refunded", when part of it has gone back. */
  refundedNote: string | null;
  /** What happened, in one sentence. */
  reason: string;
  /** What staff should do about it. */
  action: string;
  /** The order the entry opens: "#ORD-20261013-AB12CD". */
  orderNumber: string;
  /** What that order is to this entry: "Order to refund", "Order". */
  orderLabel: string;
  /** The gateway's id for the payment, when there is one to look up. */
  gatewayPaymentId: string | null;
  /** "Paid Oct 13, 2026 at 5:44 AM". */
  paidOn: string;
}

function withHash(orderNumber: string): string {
  return orderNumber.startsWith("#") ? orderNumber : `#${orderNumber}`;
}

export function describeNeedsRefundEntry(
  entry: NeedsRefundEntry,
): NeedsRefundLines {
  const { dateStr, timeStr } = formatOrderDate(entry.paidAt);
  const shared = {
    buyerName: entry.buyer.name,
    buyerEmail: entry.buyer.email,
    courseTitle: entry.courseTitle || "Course order",
    amount: formatCurrency(entry.amount, entry.currency),
    refundedNote:
      entry.refundedAmount > 0
        ? `${formatCurrency(entry.refundedAmount, entry.currency)} already refunded`
        : null,
    gatewayPaymentId: entry.gatewayPaymentId,
    paidOn: timeStr ? `Paid ${dateStr} at ${timeStr}` : `Paid ${dateStr}`,
  };

  if (entry.kind === "surplus_payment") {
    const orderNumber = withHash(entry.order.orderNumber);
    return {
      ...shared,
      reason: `The gateway took this payment after order ${orderNumber} had already been paid another way. Nothing was granted for it.`,
      action:
        "Refund this payment from the gateway dashboard. Leave the order as it is.",
      orderNumber,
      orderLabel: "Order",
    };
  }

  const later = withHash(entry.order.orderNumber);
  const earlier = withHash(entry.earlierOrder.orderNumber);
  const reason = `Paid for twice: order ${earlier} first, then order ${later}. The learner keeps access either way.`;

  // A manual transfer cannot be sent back from this screen, so the usual
  // advice would lead to a refusal.
  if (entry.gatewayProvider === "manual") {
    return {
      ...shared,
      reason,
      action: `The later order was paid by manual transfer and cannot be refunded from here. Refund order ${earlier} instead, or return the money outside the platform.`,
      orderNumber: later,
      orderLabel: "Later order",
    };
  }

  return {
    ...shared,
    reason,
    action:
      entry.orderTotalAmount > entry.amount
        ? `Make a partial refund of ${shared.amount} on the later order. It also holds other items, so do not refund all of it.`
        : "Refund the later order.",
    orderNumber: later,
    orderLabel: "Order to refund",
  };
}

/** The notice's heading: how many there are, in plain words. */
export function needsRefundHeadline(count: number, hasMore: boolean): string {
  if (hasMore) return `More than ${count} payments need a manual refund`;
  return count === 1
    ? "1 payment needs a manual refund"
    : `${count} payments need a manual refund`;
}
