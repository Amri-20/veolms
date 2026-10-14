import type { FastifyRequest } from "fastify";
import type {
  CheckoutPreviewRequest,
  CreateCheckoutOrderRequest,
} from "@veolms/contracts";
import type { CheckoutService } from "./checkout.service.ts";
import { config } from "../../../config.ts";
import { AppError } from "../../../lib/errors.ts";

export function createCheckoutController({
  service,
}: {
  service: CheckoutService;
}) {
  async function previewCheckout(
    request: FastifyRequest<{ Body: CheckoutPreviewRequest }>,
  ) {
    const userId = request.user?.id;
    return await service.previewCheckout(userId, request.body);
  }

  async function createOrder(
    request: FastifyRequest<{ Body: CreateCheckoutOrderRequest }>,
  ) {
    // Paid or free, an enrolment needs a verified mobile number when the
    // academy asks for one. The course page asks for it before it gets
    // here; this holds for any other way in.
    if (
      config.REQUIRE_VERIFIED_PHONE_FOR_ENROLLMENT &&
      !request.user!.mobileVerified
    ) {
      throw new AppError(
        403,
        "PHONE_VERIFICATION_REQUIRED",
        "Verify your mobile number to enroll.",
      );
    }
    const user = {
      id: request.user!.id,
      name: request.user!.displayName || request.user!.username,
      email: request.user!.email,
      phone: request.user!.phoneNo,
    };
    return await service.createOrder(user, request.body);
  }

  return {
    previewCheckout,
    createOrder,
  };
}
