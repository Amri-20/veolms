import { CHECKOUT_WINDOW_SECONDS } from "@veolms/contracts";

/**
 * A gateway order cannot be withdrawn: once the buyer has been handed one,
 * they can pay it for as long as a payment window for it is open. The web
 * app closes its window after CHECKOUT_WINDOW_SECONDS; the server waits this
 * much longer before it treats the window as closed, to allow for the time
 * between its answer and the window opening, and for clock differences.
 */
export const CHECKOUT_WINDOW_GRACE_SECONDS = 120;

/**
 * How long an order that was created a moment ago, and has not been given
 * its gateway order yet, is treated as being in checkout. The gateway is
 * asked after the order is stored, so without this a second request arriving
 * in between would replace an order whose payment window is about to open.
 */
export const GATEWAY_ORDER_PENDING_SECONDS = 60;

/**
 * Seconds until an unpaid order's payment window is certainly closed; 0 when
 * the order is not in checkout. `handedOutAt` is the last time its gateway
 * order was returned to the buyer (created or resumed). An order with
 * nothing to pay is never in checkout.
 */
export function checkoutSecondsLeft(
  order: {
    handedOutAt: Date | null | undefined;
    createdAt: Date;
    totalAmount: number;
    /** Unpaid and not past its deadline. */
    isOpen: boolean;
  },
  now: Date,
): number {
  if (order.totalAmount <= 0) return 0;
  const [since, seconds] = order.handedOutAt
    ? [
        order.handedOutAt,
        CHECKOUT_WINDOW_SECONDS + CHECKOUT_WINDOW_GRACE_SECONDS,
      ]
    : order.isOpen
      ? [order.createdAt, GATEWAY_ORDER_PENDING_SECONDS]
      : [null, 0];
  if (!since) return 0;
  const left = Math.ceil(
    (new Date(since).getTime() + seconds * 1000 - now.getTime()) / 1000,
  );
  return Math.max(0, left);
}

/** What a set of line items would give the buyer. */
export interface Coverage {
  /** `type:id` of each line, for comparing item sets. */
  itemKeys: ReadonlySet<string>;
  /** Courses bought directly or inside a bundle. */
  courseIds: ReadonlySet<string>;
  quizPricingIds: ReadonlySet<string>;
}

/**
 * Bundles are expanded from `bundleCourses`, their contents as they are now:
 * what an unpaid order's bundle will grant is only recorded when it is paid.
 */
export function coverageOf(
  items: ReadonlyArray<{ itemType: string; itemId: string | null | undefined }>,
  bundleCourses: ReadonlyArray<{ bundle_id: string; course_id: string }>,
): Coverage {
  const itemKeys = new Set<string>();
  const courseIds = new Set<string>();
  const quizPricingIds = new Set<string>();
  for (const item of items) {
    itemKeys.add(`${item.itemType}:${item.itemId ?? ""}`);
    if (!item.itemId) continue;
    if (item.itemType === "course") courseIds.add(item.itemId);
    else if (item.itemType === "quiz") quizPricingIds.add(item.itemId);
    else if (item.itemType === "bundle") {
      for (const row of bundleCourses) {
        if (row.bundle_id === item.itemId) courseIds.add(row.course_id);
      }
    }
  }
  return { itemKeys, courseIds, quizPricingIds };
}

function intersects(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  for (const value of a) if (b.has(value)) return true;
  return false;
}

export function sameItems(a: Coverage, b: Coverage): boolean {
  return (
    a.itemKeys.size === b.itemKeys.size &&
    [...a.itemKeys].every((key) => b.itemKeys.has(key))
  );
}

/** True when paying for both would pay twice for something. */
export function coverageOverlaps(a: Coverage, b: Coverage): boolean {
  return (
    intersects(a.courseIds, b.courseIds) ||
    intersects(a.quizPricingIds, b.quizPricingIds) ||
    // A bundle with no courses left still is the same purchase as itself.
    intersects(a.itemKeys, b.itemKeys)
  );
}

/** One of the buyer's other unpaid orders, as it bears on a new checkout. */
export interface OpenOrderFacts {
  id: string;
  /** Unpaid and not past its deadline: it can be continued or replaced. */
  isOpen: boolean;
  /** Exactly the items of the new request. */
  sameItems: boolean;
  /** Shares a course or quiz pass with the new request. */
  overlaps: boolean;
  /** Same amount, currency and coupon as the new request. */
  sameTerms: boolean;
  /** A bank transfer was reported for it and staff have not answered. */
  manualPaymentPending: boolean;
  /** From checkoutSecondsLeft. */
  checkoutSecondsLeft: number;
}

export type OpenOrderDecision =
  | { kind: "manual_payment_pending"; orderId: string }
  | { kind: "checkout_in_progress"; orderId: string; secondsLeft: number }
  | { kind: "proceed"; resumeOrderId?: string; supersedeOrderIds: string[] };

/**
 * What a new checkout does about the buyer's other unpaid orders, given
 * newest first. One buyer has at most one payable order for any course or
 * quiz pass:
 *
 *  - the same items on the same terms continue the order that exists;
 *  - any other order that shares something with the request is closed first,
 *    unless a payment for it may still arrive: a transfer waiting for staff,
 *    or a payment window that may still be open. Then the request is
 *    refused, because closing the order would not stop that payment.
 */
export function decideOpenOrders(
  orders: ReadonlyArray<OpenOrderFacts>,
): OpenOrderDecision {
  const related = orders.filter((order) => order.sameItems || order.overlaps);
  const resume = related.find(
    (order) => order.isOpen && order.sameItems && order.sameTerms,
  );
  const others = related.filter((order) => order !== resume);

  // The order that would be continued counts too: continuing it hands out
  // its gateway order again.
  const awaitingTransfer = related.find((order) => order.manualPaymentPending);
  if (awaitingTransfer) {
    return { kind: "manual_payment_pending", orderId: awaitingTransfer.id };
  }
  const inCheckout = others
    .filter((order) => order.checkoutSecondsLeft > 0)
    .sort((a, b) => b.checkoutSecondsLeft - a.checkoutSecondsLeft)[0];
  if (inCheckout) {
    return {
      kind: "checkout_in_progress",
      orderId: inCheckout.id,
      secondsLeft: inCheckout.checkoutSecondsLeft,
    };
  }
  return {
    kind: "proceed",
    ...(resume ? { resumeOrderId: resume.id } : {}),
    supersedeOrderIds: others
      .filter((order) => order.isOpen)
      .map((order) => order.id),
  };
}
