import assert from "node:assert/strict";
import { test } from "node:test";

import type { PaymentGateway } from "@veolms/contracts";

import { findGatewayCapture } from "./captured-gateway-payment.ts";

type OrderPayment = Awaited<
  ReturnType<PaymentGateway["fetchOrderPayments"]>
>[number];

/** A gateway that answers from what it is given and counts what it is asked. */
function gateway(orderStatus: string, payments: Partial<OrderPayment>[] = []) {
  const calls = { fetchOrder: 0, fetchOrderPayments: 0 };
  const fake = {
    fetchOrder: async () => {
      calls.fetchOrder += 1;
      return { status: orderStatus };
    },
    fetchOrderPayments: async () => {
      calls.fetchOrderPayments += 1;
      return payments;
    },
  } as unknown as PaymentGateway;
  return { fake, calls };
}

const unconfirmed = {
  gateway_order_id: "order_1",
  gateway_payment_id: null,
  payment_method: null,
};

await test("an order the gateway has not been paid for is unpaid, and its payments are not asked for", async () => {
  for (const status of ["created", "attempted"]) {
    const { fake, calls } = gateway(status);
    assert.deepEqual(await findGatewayCapture(fake, unconfirmed), {
      state: "unpaid",
    });
    assert.equal(calls.fetchOrderPayments, 0);
  }
});

await test("a paid order names its captured payment, past the attempts that failed", async () => {
  const { fake } = gateway("paid", [
    { gatewayPaymentId: "pay_failed", status: "failed", method: "card" },
    {
      gatewayPaymentId: "pay_ok",
      status: "captured",
      method: "card",
      cardLast4: "6571",
    },
  ]);
  assert.deepEqual(await findGatewayCapture(fake, unconfirmed), {
    state: "captured",
    gatewayPaymentId: "pay_ok",
    paymentMethod: {
      method: "card",
      bank: undefined,
      wallet: undefined,
      vpa: undefined,
      cardLast4: "6571",
    },
  });
});

await test("a payment id we already hold is used as it is", async () => {
  const { fake, calls } = gateway("paid");
  const known = {
    gateway_order_id: "order_1",
    gateway_payment_id: "pay_known",
    payment_method: { method: "upi" },
  };
  assert.deepEqual(await findGatewayCapture(fake, known), {
    state: "captured",
    gatewayPaymentId: "pay_known",
    paymentMethod: { method: "upi" },
  });
  assert.equal(calls.fetchOrderPayments, 0);
});

await test("a paid order with no captured payment to name is left for the webhook", async () => {
  const { fake } = gateway("paid", [
    { gatewayPaymentId: "pay_open", status: "processing" },
  ]);
  assert.deepEqual(await findGatewayCapture(fake, unconfirmed), {
    state: "paid-unidentified",
  });
});
