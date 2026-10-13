import assert from "node:assert/strict";
import { test } from "node:test";

import { needsRefundEntrySchema } from "@veolms/contracts";

import { describeSurplusCapture } from "../payments/surplus-payment.ts";
import {
  compareNewestFirst,
  isDuplicateStillOwed,
  toCursorTime,
  toDuplicatePurchaseEntry,
  toManualTransferForPaidOrderEntry,
  toNeedsRefundBuyer,
  toSurplusPaymentEntry,
} from "./needs-refund.mapper.ts";
import type {
  DuplicatePurchaseRow,
  ManualTransferForPaidOrderRow,
  SurplusPaymentToReturnRow,
} from "./needs-refund.repository.ts";

const buyer = {
  display_name: "Asha Rao",
  username: "asha",
  email: "asha@example.test",
};

const surplusRow: SurplusPaymentToReturnRow = {
  id: "11111111-1111-4111-8111-111111111111",
  order_id: "22222222-2222-4222-8222-222222222222",
  order_number: "ORD-20261013-AB12CD",
  user_id: "33333333-3333-4333-8333-333333333333",
  amount: 49900,
  currency: "INR",
  gateway_provider: "razorpay",
  gateway_payment_id: "pay_late_1",
  error_description: describeSurplusCapture("ORD-20261013-AB12CD"),
  item_titles: "Node.js, TypeScript",
  paid_at: new Date("2026-10-13T08:00:00.000Z"),
  paid_at_cursor: "2026-10-13T08:00:00.000000Z",
};

const duplicateRow: DuplicatePurchaseRow = {
  id: "44444444-4444-4444-8444-444444444444",
  course_id: "55555555-5555-4555-8555-555555555555",
  title_snapshot: "Node.js",
  user_id: "33333333-3333-4333-8333-333333333333",
  currency: "INR",
  order_id: "66666666-6666-4666-8666-666666666666",
  order_number: "ORD-20261013-LATER1",
  final_amount: 600,
  total_amount: 850,
  paid_at: new Date("2026-10-13T09:00:00.000Z"),
  paid_at_cursor: "2026-10-13T09:00:00.000000Z",
  earlier_order_id: "77777777-7777-4777-8777-777777777777",
  earlier_order_number: "ORD-20261013-EARLY1",
  earlier_final_amount: 499,
  earlier_paid_at: new Date("2026-10-13T08:30:00.000Z"),
  refunded_amount: "10000",
  gateway_provider: "razorpay",
  gateway_payment_id: "pay_second_1",
};

const transferRow: ManualTransferForPaidOrderRow = {
  id: "88888888-8888-4888-8888-888888888888",
  order_id: "99999999-9999-4999-8999-999999999999",
  order_number: "ORD-20261013-PAID01",
  user_id: "33333333-3333-4333-8333-333333333333",
  total_amount: 499,
  currency: "INR",
  payment_method: "bank_transfer",
  transaction_reference: "utr 4411 9020",
  item_titles: "Node.js",
  submitted_at: new Date("2026-10-13T07:45:00.000Z"),
  paid_at_cursor: "2026-10-13T07:45:00.000000Z",
};

await test("a surplus payment keeps its minor-unit amount and reads its refunds from the note", () => {
  const untouched = toSurplusPaymentEntry(surplusRow, buyer);
  assert.equal(untouched.kind, "surplus_payment");
  assert.equal(untouched.amount, 49900);
  assert.equal(untouched.refundedAmount, 0);
  assert.equal(untouched.courseTitle, "Node.js, TypeScript");
  assert.deepEqual(untouched.order, {
    id: surplusRow.order_id,
    orderNumber: "ORD-20261013-AB12CD",
  });
  assert.equal(untouched.gatewayPaymentId, "pay_late_1");

  const partReturned = toSurplusPaymentEntry(
    {
      ...surplusRow,
      error_description: `${surplusRow.error_description} Refund rfnd_1 of 10000 INR (minor units) reported by the gateway. Refund rfnd_2 of 5000 INR (minor units) reported by the gateway.`,
    },
    buyer,
  );
  assert.equal(partReturned.refundedAmount, 15000);
});

await test("a surplus payment never reports more returned than was taken", () => {
  const entry = toSurplusPaymentEntry(
    {
      ...surplusRow,
      error_description:
        "Refund rfnd_1 of 49900 INR (minor units) reported by the gateway. Refund rfnd_2 of 100 INR (minor units) reported by the gateway.",
    },
    buyer,
  );
  assert.equal(entry.refundedAmount, 49900);
});

await test("a duplicate purchase converts order and item amounts to minor units and leaves refunds as they are", () => {
  const entry = toDuplicatePurchaseEntry(duplicateRow, buyer);
  assert.equal(entry.kind, "duplicate_purchase");
  // 600 rupees on the item, 850 on the order: major units in storage.
  assert.equal(entry.amount, 60000);
  assert.equal(entry.orderTotalAmount, 85000);
  assert.equal(entry.earlierOrder.amount, 49900);
  // Refunds are stored in minor units already.
  assert.equal(entry.refundedAmount, 10000);
  assert.deepEqual(entry.order, {
    id: duplicateRow.order_id,
    orderNumber: "ORD-20261013-LATER1",
  });
  assert.equal(entry.earlierOrder.orderNumber, "ORD-20261013-EARLY1");
  assert.equal(entry.courseId, duplicateRow.course_id);
});

await test("a zero-decimal currency is not multiplied by 100", () => {
  const entry = toDuplicatePurchaseEntry(
    { ...duplicateRow, currency: "JPY" },
    buyer,
  );
  assert.equal(entry.amount, 600);
  assert.equal(entry.orderTotalAmount, 850);
});

await test("a reported transfer claims the order's total in minor units and keeps the reference as the buyer typed it", () => {
  const entry = toManualTransferForPaidOrderEntry(transferRow, buyer);
  assert.equal(entry.kind, "manual_transfer_for_paid_order");
  assert.equal(entry.id, transferRow.id);
  // 499 rupees on the order: major units in storage.
  assert.equal(entry.amount, 49900);
  assert.equal(entry.currency, "INR");
  assert.equal(entry.paymentMethod, "bank_transfer");
  assert.equal(entry.transactionReference, "utr 4411 9020");
  assert.equal(entry.courseTitle, "Node.js");
  assert.deepEqual(entry.order, {
    id: transferRow.order_id,
    orderNumber: "ORD-20261013-PAID01",
  });
  assert.equal(entry.submittedAt, transferRow.submitted_at);
  assert.deepEqual(entry.buyer, {
    name: "Asha Rao",
    email: "asha@example.test",
    username: "asha",
  });

  // Zero-decimal currency: 499 yen is 499 minor units.
  assert.equal(
    toManualTransferForPaidOrderEntry({ ...transferRow, currency: "JPY" })
      .amount,
    499,
  );
});

await test("every kind satisfies the strict response contract once serialised", () => {
  for (const entry of [
    toSurplusPaymentEntry(surplusRow, buyer),
    toDuplicatePurchaseEntry(duplicateRow, buyer),
    toManualTransferForPaidOrderEntry(transferRow, buyer),
    toManualTransferForPaidOrderEntry(
      { ...transferRow, item_titles: null },
      undefined,
    ),
    toSurplusPaymentEntry({ ...surplusRow, item_titles: null }, undefined),
    toDuplicatePurchaseEntry(
      { ...duplicateRow, gateway_provider: null, gateway_payment_id: null },
      undefined,
    ),
  ]) {
    const wire: unknown = JSON.parse(JSON.stringify(entry));
    assert.equal(needsRefundEntrySchema.safeParse(wire).success, true);
  }
});

await test("a buyer is named by display name, then username, and a missing account still has a name", () => {
  assert.deepEqual(toNeedsRefundBuyer(buyer), {
    name: "Asha Rao",
    email: "asha@example.test",
    username: "asha",
  });
  assert.equal(toNeedsRefundBuyer({ ...buyer, display_name: "" }).name, "asha");
  assert.deepEqual(toNeedsRefundBuyer(undefined), {
    name: "Student",
    email: null,
    username: null,
  });
});

await test("the three kinds sort into one list by their own times: a transfer by when it was reported", () => {
  const rows = [surplusRow, transferRow, duplicateRow];
  assert.deepEqual(
    [...rows].sort(compareNewestFirst).map((row) => row.id),
    // Paid 09:00, paid 08:00, reported 07:45.
    [duplicateRow.id, surplusRow.id, transferRow.id],
  );
});

await test("entries of both kinds sort newest first, ties broken by id", () => {
  const rows = [
    { paid_at_cursor: "2026-10-13T08:00:00.000001Z", id: "a" },
    { paid_at_cursor: "2026-10-13T09:00:00.000000Z", id: "b" },
    { paid_at_cursor: "2026-10-13T08:00:00.000001Z", id: "c" },
    { paid_at_cursor: "2026-10-13T08:00:00.000000Z", id: "d" },
  ];
  assert.deepEqual(
    [...rows].sort(compareNewestFirst).map((row) => row.id),
    ["b", "c", "a", "d"],
  );
  assert.equal(compareNewestFirst(rows[0]!, rows[0]!), 0);
});

await test("a duplicate is owed until the later order has been refunded the course's price", () => {
  const item = { final_amount: 499, currency: "INR" };
  assert.equal(isDuplicateStillOwed({ ...item, refunded_amount: "0" }), true);
  // A smaller part refund: still listed, with what has gone back.
  assert.equal(
    isDuplicateStillOwed({ ...item, refunded_amount: "49899" }),
    true,
  );
  // 499 rupees back, by a part refund of an order that holds other items.
  assert.equal(
    isDuplicateStillOwed({ ...item, refunded_amount: "49900" }),
    false,
  );
  assert.equal(
    isDuplicateStillOwed({ ...item, refunded_amount: "74900" }),
    false,
  );
  // Zero-decimal currency: 499 yen is 499 minor units, not 49900.
  assert.equal(
    isDuplicateStillOwed({
      final_amount: 499,
      currency: "JPY",
      refunded_amount: "499",
    }),
    false,
  );
});

await test("a cursor time is padded to the six fractional digits the queries print", () => {
  assert.equal(
    toCursorTime("2026-10-13T00:14:07.436Z"),
    "2026-10-13T00:14:07.436000Z",
  );
  assert.equal(
    toCursorTime("2026-10-13T00:14:07.436123Z"),
    "2026-10-13T00:14:07.436123Z",
  );
  assert.equal(
    toCursorTime("2026-10-13T00:14:07Z"),
    "2026-10-13T00:14:07.000000Z",
  );
});
