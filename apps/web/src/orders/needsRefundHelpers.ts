import type { NeedsRefundEntry } from "@veolms/contracts";
import { formatCurrency, formatOrderDate } from "./orderHelpers";

/**
 * The words the Orders screen shows for one payment that staff have to
 * return by hand. Kept apart from the component, and free of React, so the
 * wording for each kind of entry can be read and replayed on its own.
 */
export interface NeedsRefundLines {
  buyerName: string;
  buyerEmail: string | null;
  courseTitle: string;
  /** What has to go back, formatted: "₹600". */
  amount: string;
  /** What that amount is: "Amount", or "Order total" for a transfer. */
  amountLabel: string;
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
  /**
   * What to look the money up by, when there is something: the gateway's
   * id for the payment, or the reference the buyer gave for a transfer.
   */
  reference: string | null;
  /** What that is called: "Payment ID", "Reference". */
  referenceLabel: string;
  /** "Paid Oct 13, 2026 at 5:44 AM"; "Reported ..." for a transfer. */
  when: string;
}

function withHash(orderNumber: string): string {
  return orderNumber.startsWith("#") ? orderNumber : `#${orderNumber}`;
}

function onDate(verb: string, value: string | Date): string {
  const { dateStr, timeStr } = formatOrderDate(value);
  return timeStr ? `${verb} ${dateStr} at ${timeStr}` : `${verb} ${dateStr}`;
}

/** How the buyer said they paid, as it reads inside a sentence. */
function transferName(paymentMethod: string): string {
  if (paymentMethod === "upi") return "a UPI payment";
  if (paymentMethod === "bank_transfer") return "a bank transfer";
  return "a transfer";
}

export function describeNeedsRefundEntry(
  entry: NeedsRefundEntry,
): NeedsRefundLines {
  const buyerAndCourse = {
    buyerName: entry.buyer.name,
    buyerEmail: entry.buyer.email,
    courseTitle: entry.courseTitle || "Course order",
    amount: formatCurrency(entry.amount, entry.currency),
  };

  // Money the platform never recorded: there is no payment to refund and
  // nothing has gone back that it could know of. What staff have is the
  // reference the buyer gave, and the request to close when they are done.
  if (entry.kind === "manual_transfer_for_paid_order") {
    const orderNumber = withHash(entry.order.orderNumber);
    return {
      ...buyerAndCourse,
      amountLabel: "Order total",
      refundedNote: null,
      reason: `The learner reported ${transferName(entry.paymentMethod)} for order ${orderNumber}, and the order was then paid another way. Nothing was granted for the transfer.`,
      action:
        "Check your bank account for this transfer. If it arrived, return it to the learner outside the platform. Then reject this request.",
      orderNumber,
      orderLabel: "Order",
      reference: entry.transactionReference,
      referenceLabel: "Reference",
      when: onDate("Reported", entry.submittedAt),
    };
  }

  const shared = {
    ...buyerAndCourse,
    amountLabel: "Amount",
    refundedNote:
      entry.refundedAmount > 0
        ? `${formatCurrency(entry.refundedAmount, entry.currency)} already refunded`
        : null,
    reference: entry.gatewayPaymentId,
    referenceLabel: "Payment ID",
    when: onDate("Paid", entry.paidAt),
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
