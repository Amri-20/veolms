import type { AdminOrder, OutsideRefund } from "@veolms/contracts";

/** Longest transfer reference the refund endpoint accepts. */
export const OUTSIDE_REFUND_REFERENCE_MAX_LENGTH = 100;

/**
 * Whether the order's payment arrived by manual bank or UPI transfer. Such
 * an order has no gateway payment: staff return the money themselves and the
 * refund dialog only records it.
 */
export function isPaidByManualTransfer(order: Pick<AdminOrder, "admin">) {
  return order.admin.payment?.gatewayProvider === "manual";
}

export type OutsideRefundInput =
  | { ok: true; outsideRefund: OutsideRefund | undefined }
  | { ok: false; message: string };

/**
 * The `outsideRefund` part of a refund request. Sent only for an order paid
 * by manual transfer, where the reference of the transfer staff made is
 * required; left out for every other order, whatever was typed.
 */
export function toOutsideRefundInput(
  paidByManualTransfer: boolean,
  referenceInput: string,
): OutsideRefundInput {
  if (!paidByManualTransfer) return { ok: true, outsideRefund: undefined };

  const reference = referenceInput.trim();
  if (!reference) {
    return {
      ok: false,
      message: "Please enter the reference of the transfer you made.",
    };
  }
  if (reference.length > OUTSIDE_REFUND_REFERENCE_MAX_LENGTH) {
    return {
      ok: false,
      message: `Transfer reference cannot be longer than ${OUTSIDE_REFUND_REFERENCE_MAX_LENGTH} characters.`,
    };
  }
  return { ok: true, outsideRefund: { reference } };
}
