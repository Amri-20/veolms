import type {
  CheckoutPreviewRequest,
  CheckoutPreviewResponse,
  CreateCheckoutOrderRequest,
  CreateCheckoutOrderResponse,
  ManualPaymentRequest,
  VerifyManualPaymentRequest,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
} from "@veolms/contracts";
import { api } from "../../lib/api-client";

export const paymentService = {
  preview: (input: CheckoutPreviewRequest) =>
    api.post<CheckoutPreviewResponse>("/checkout/preview", input),
  createOrder: (input: CreateCheckoutOrderRequest) =>
    api.post<CreateCheckoutOrderResponse>("/checkout/orders", input),
  verify: (input: VerifyPaymentRequest) =>
    api.post<VerifyPaymentResponse>("/payments/verify", input),
  /**
   * Staff's answer to a transfer a buyer reported for an order (admins
   * only): `verify` marks the order paid by it, `reject` closes the request.
   */
  reviewManualPayment: (requestId: string, input: VerifyManualPaymentRequest) =>
    api.post<ManualPaymentRequest>(
      `/manual-payments/${encodeURIComponent(requestId)}/verify`,
      input,
    ),
};
