import crypto from "node:crypto";
import type {
  CheckoutPreviewRequest,
  CheckoutPreviewResponse,
  CreateCheckoutOrderRequest,
  CreateCheckoutOrderResponse,
  PaymentGateway,
} from "@veolms/contracts";
import type { Database } from "@veolms/database";
import type { Kysely } from "kysely";
import { AppError } from "../../../lib/errors.ts";
import { CommerceErrors } from "../shared/commerce.errors.ts";
import { isUniqueViolation } from "../shared/db-errors.ts";
import * as bundleRepo from "../bundles/bundle.repository.ts";
import * as couponRepo from "../coupons/coupon.repository.ts";
import * as enrollmentRepo from "../enrollments/enrollment.repository.ts";
import * as orderRepo from "../orders/order.repository.ts";
import * as paymentRepo from "../payments/payment.repository.ts";
import {
  createPricingService,
  type PricingService,
} from "../pricing/pricing.service.ts";
import {
  createPaymentService,
  type PaymentService,
} from "../payments/payment.service.ts";
import {
  createPaymentReconciliationService,
  type PaymentReconciliationService,
} from "../payments/payment-reconciliation.service.ts";

/** Coupon refusals that confirm a code exists; see previewCheckout. */
const ANONYMOUS_HIDDEN_COUPON_ERRORS: ReadonlySet<string> = new Set([
  "COUPON_INACTIVE",
  "COUPON_NOT_STARTED",
  "COUPON_EXPIRED",
  "COUPON_USAGE_LIMIT_REACHED",
  "COUPON_MIN_ORDER_NOT_MET",
  "COUPON_NOT_APPLICABLE",
]);

export interface CheckoutService {
  previewCheckout(
    userId: string | undefined,
    request: CheckoutPreviewRequest,
  ): Promise<CheckoutPreviewResponse>;
  createOrder(
    user: {
      id: string;
      name: string;
      email?: string | null;
      phone?: string | null;
    },
    request: CreateCheckoutOrderRequest,
  ): Promise<CreateCheckoutOrderResponse>;
}

export interface CheckoutServiceOptions {
  database: Kysely<Database>;
  paymentGateway: PaymentGateway;
  pricingService?: PricingService;
  paymentService?: PaymentService;
  reconciliationService?: PaymentReconciliationService;
}

export function createCheckoutService({
  database,
  paymentGateway,
  pricingService = createPricingService({ database }),
  paymentService = createPaymentService({ database, paymentGateway }),
  reconciliationService = createPaymentReconciliationService({ database }),
}: CheckoutServiceOptions): CheckoutService {
  /**
   * Generates a preview of checkout calculation with live item pricing and optional coupon.
   */
  async function previewCheckout(
    userId: string | undefined,
    request: CheckoutPreviewRequest,
  ): Promise<CheckoutPreviewResponse> {
    const { pricing, couponValidation } = await pricingService
      .calculatePricing({
        userId,
        items: request.items,
        couponCode: request.couponCode,
      })
      .catch((error: unknown) => {
        // A visitor who is not signed in learns only that a code did not
        // work. The exact reason (expired, used up, not yet started, a
        // minimum order) confirms that the code exists, and is given once
        // the buyer is signed in.
        if (
          !userId &&
          request.couponCode &&
          error instanceof AppError &&
          ANONYMOUS_HIDDEN_COUPON_ERRORS.has(error.code)
        ) {
          throw CommerceErrors.INVALID_COUPON(
            request.couponCode.trim().toUpperCase(),
          );
        }
        throw error;
      });

    // The wire shape is what the checkout UI shows; the per-item breakdown
    // and the coupon's id are for order creation and stay here.
    return {
      pricing: {
        discountAmount: pricing.discountAmount,
        totalAmount: pricing.totalAmount,
        currency: pricing.currency,
      },
      couponValidation: couponValidation && {
        valid: couponValidation.valid,
        discountType: couponValidation.discountType,
        discountValue: couponValidation.discountValue,
        message: couponValidation.message,
      },
    };
  }

  /**
   * Generates human-friendly order numbers like ORD-YYYYMMDD-XXXX
   */
  function generateOrderNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `ORD-${dateStr}-${randomHex}`;
  }

  type CheckoutUser = {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  type OrderRow = NonNullable<
    Awaited<ReturnType<typeof orderRepo.findOrderByIdempotencyKey>>
  >;

  /**
   * Refuses to continue an unpaid order for something the buyer has come to
   * own since it was created (another order of theirs was paid, or access
   * was granted). New orders are refused for this by pricing; a resumed one
   * skipped that check and handed out a gateway order for a second payment.
   */
  async function assertStillPurchasable(order: OrderRow): Promise<void> {
    const [items, ownedCourseIds] = await Promise.all([
      orderRepo.listOrderItems(database, order.id),
      enrollmentRepo.listUserEnrolledCourseIds(database, order.user_id),
    ]);
    const owned = new Set(ownedCourseIds);
    if (owned.size === 0) return;

    const bundleIds = items
      .filter((item) => item.item_type === "bundle" && item.bundle_id)
      .map((item) => item.bundle_id!);
    const bundleCourses = await bundleRepo.listBundleCoursesForBundleIds(
      database,
      bundleIds,
    );

    for (const item of items) {
      if (item.item_type === "course" && item.course_id) {
        if (owned.has(item.course_id)) {
          throw CommerceErrors.COURSE_ALREADY_OWNED(item.title_snapshot);
        }
      } else if (item.item_type === "bundle" && item.bundle_id) {
        const courseIds = bundleCourses
          .filter((row) => row.bundle_id === item.bundle_id)
          .map((row) => row.course_id);
        if (
          courseIds.length > 0 &&
          courseIds.every((courseId) => owned.has(courseId))
        ) {
          throw CommerceErrors.BUNDLE_ALL_COURSES_OWNED(item.title_snapshot);
        }
      }
    }
  }

  /**
   * Returns the checkout response for an order that already exists, bringing
   * its payment to the point the client can continue from. Used when a
   * request repeats an earlier one: same idempotency key, or the same items
   * under a coupon the earlier order is still holding.
   */
  async function resumeExistingOrder(
    existingOrder: OrderRow,
    user: CheckoutUser,
  ): Promise<CreateCheckoutOrderResponse> {
    const payment = await paymentRepo.findPaymentByOrderId(
      database,
      existingOrder.id,
    );
    const order = { id: existingOrder.id, status: existingOrder.status };

    if (existingOrder.status !== "paid" && existingOrder.total_amount > 0) {
      await assertStillPurchasable(existingOrder);
    }

    if (payment) {
      const isFreeOrder =
        payment.gateway_provider === "free" || payment.amount === 0;

      if (isFreeOrder && payment.status !== "captured") {
        await reconciliationService.finalizeSuccessfulPayment({
          paymentId: payment.id,
          gatewayPaymentId:
            payment.gateway_payment_id ?? `free_pay_${existingOrder.id}`,
          paymentMethod: { method: "free" },
        });
        // Finalizing marked the order paid; the row read above predates it.
        return {
          order: { id: existingOrder.id, status: "paid" },
          gateway: null,
        };
      }

      return {
        order,
        gateway: isFreeOrder
          ? null
          : {
              gatewayOrderId: payment.gateway_order_id,
              keyId: payment.gateway_key_id ?? undefined,
              amount: payment.amount,
              currency: payment.currency,
            },
      };
    }

    // Order exists (from a prior attempt) but no payment row does — a paid
    // (non-free) checkout creates its payment row via
    // paymentService.initializePayment() *outside* the order-creation
    // transaction (step 5 below), so a gateway timeout or crash between the
    // two leaves exactly this state: order committed, payment never
    // initialized. A free checkout can't reach this branch — its payment row
    // is created atomically with the order in the same transaction (step 3),
    // so it always exists by the time the order does.
    //
    // Resume for the SAME order instead of creating another one, which for
    // the idempotency-key caller would collide with the UNIQUE constraint on
    // orders.idempotency_key.
    const { gatewayOrder } = await paymentService.initializePayment({
      orderId: existingOrder.id,
      customer: user,
    });

    return {
      order,
      gateway: {
        gatewayOrderId: gatewayOrder.gatewayOrderId,
        keyId: gatewayOrder.keyId,
        amount: gatewayOrder.amount,
        currency: gatewayOrder.currency,
      },
    };
  }

  /** Order-independent identity of a line item, for comparing item sets. */
  const itemKey = (itemType: string, itemId: string | null | undefined) =>
    `${itemType}:${itemId ?? ""}`;

  /**
   * Full order creation pipeline with recalculation, snapshots, idempotency, and gateway order creation.
   */
  async function createOrder(
    user: {
      id: string;
      name: string;
      email?: string | null;
      phone?: string | null;
    },
    request: CreateCheckoutOrderRequest,
  ): Promise<CreateCheckoutOrderResponse> {
    const { items, couponCode, idempotencyKey } = request;

    // 1. Idempotency Check: return existing order if same idempotency key was submitted
    if (idempotencyKey) {
      const existingOrder = await orderRepo.findOrderByIdempotencyKey(
        database,
        idempotencyKey,
      );
      if (existingOrder) {
        if (existingOrder.user_id !== user.id) {
          throw CommerceErrors.IDEMPOTENCY_KEY_CONFLICT();
        }

        // A paid order is replayed as it is (the client shows it as bought),
        // and an unpaid one is continued while it is still open. Anything
        // else (expired, cancelled, refunded) cannot be continued: handing
        // back its gateway order invited a payment for an order that had
        // already ended. It gives up the key and this request starts afresh,
        // at today's price.
        const isOpen =
          existingOrder.status === "pending" &&
          new Date(existingOrder.expires_at) > new Date();
        if (isOpen || existingOrder.status === "paid") {
          return await resumeExistingOrder(existingOrder, user);
        }
        await orderRepo.releaseOrderIdempotencyKey(database, existingOrder.id);
      }
    }

    // 2. Authoritatively recalculate pricing from database
    const { pricing } = await pricingService.calculatePricing({
      userId: user.id,
      items,
      couponCode,
    });

    const now = new Date();

    // A coupon use is held by an unpaid order from the moment it is created
    // (see the reservation check in step 3). So that a buyer who closed the
    // payment window and clicks Pay again is not blocked by their own
    // earlier attempt, a repeat of the same items under the same coupon
    // continues that order instead of creating another.
    //
    // Only when it is the same purchase to the last rupee. The same items at
    // a different amount (the buyer changed what they chose to pay) used to
    // continue the earlier order at the earlier amount, so the gateway asked
    // for a sum other than the one on the button. Such an order is closed
    // instead, which frees the coupon for the order created below.
    //
    // The same goes for an order without a coupon. It used to be left
    // open next to the new one: a buyer who changed the amount had two
    // unpaid orders for one course, each with a gateway order that could be
    // paid, and one who clicked Pay again got a further order every time.
    // Now there is one open order per buyer and set of items. The gateway
    // order of a closed one cannot be withdrawn, so a payment may still
    // arrive for it; that is honoured as for any expired order (see
    // markOrderPaidIfPending) and shows as a paid order staff can refund.
    const supersededOrderIds: string[] = [];
    let resumableOrder: OrderRow | undefined;
    const pendingOrders = await orderRepo.listPendingOrdersForUser(database, {
      userId: user.id,
      now,
    });
    if (pendingOrders.length > 0) {
      const wanted = pricing.items
        .map((it) => itemKey(it.itemType, it.itemId))
        .sort()
        .join("|");
      const pendingItems = await orderRepo.listOrderItemsByOrderIds(
        database,
        pendingOrders.map((pendingOrder) => pendingOrder.id),
      );
      for (const pendingOrder of pendingOrders) {
        const held = pendingItems
          .filter((it) => it.order_id === pendingOrder.id)
          .map((it) =>
            itemKey(
              it.item_type,
              it.course_id ?? it.bundle_id ?? it.quiz_pricing_id,
            ),
          )
          .sort()
          .join("|");
        if (held !== wanted) continue;
        if (
          !resumableOrder &&
          pendingOrder.total_amount === pricing.totalAmount &&
          pendingOrder.currency === pricing.currency &&
          pendingOrder.coupon_id === (pricing.couponId ?? null)
        ) {
          resumableOrder = pendingOrder;
          continue;
        }
        supersededOrderIds.push(pendingOrder.id);
      }
    }
    if (resumableOrder) {
      // Any other open order for these items is an older attempt at the
      // same purchase; only the one being continued stays open.
      await orderRepo.expirePendingOrders(database, supersededOrderIds, now);
      return await resumeExistingOrder(resumableOrder, user);
    }

    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour order expiry
    const orderId = crypto.randomUUID();
    const orderNumber = generateOrderNumber();
    const isFreeCheckout = pricing.totalAmount === 0;

    // 3. Database Transaction Boundary for Order + Order Items Snapshots
    let createdOrder: Awaited<ReturnType<typeof insertOrderWithItems>>;
    try {
      createdOrder = await insertOrderWithItems();
    } catch (err) {
      // Two concurrent checkouts with the same idempotency key can both
      // miss the pre-check in step 1 (it runs before either insert
      // commits). The loser surfaces here as a unique violation on
      // orders.idempotency_key — previously an unhandled 500. The winner
      // is committed by the time Postgres raises this, so re-entering
      // createOrder replays its order via the step-1 branch.
      if (
        idempotencyKey &&
        isUniqueViolation(err) &&
        String((err as { constraint?: string }).constraint ?? "").includes(
          "idempotency",
        )
      ) {
        return await createOrder(user, request);
      }
      throw err;
    }

    async function insertOrderWithItems() {
      return await database.transaction().execute(async (trx) => {
        // Before the coupon's limits are counted, so the earlier order's hold
        // is not counted against this one.
        await orderRepo.expirePendingOrders(trx, supersededOrderIds, now);

        // Reserve the coupon use. The limits used to be checked only against
        // redemptions, which are written when an order is PAID — so any
        // number of unpaid orders could be created under a single-use coupon
        // and then all paid at the discount. Under the coupon's row lock
        // (which serialises concurrent checkouts) the limits are checked
        // against redemptions plus the unpaid, unexpired orders already
        // holding the coupon; this order then holds one itself.
        if (pricing.couponId) {
          const coupon = await couponRepo.findCouponByIdForUpdate(
            trx,
            pricing.couponId,
          );
          if (!coupon) {
            throw CommerceErrors.INVALID_COUPON(couponCode ?? "");
          }

          if (coupon.global_usage_limit !== null) {
            const [redeemed, held] = await Promise.all([
              couponRepo.countCouponRedemptionsGlobal(trx, coupon.id),
              orderRepo.countPendingOrdersUsingCoupon(trx, {
                couponId: coupon.id,
                now,
              }),
            ]);
            if (redeemed + held >= coupon.global_usage_limit) {
              throw CommerceErrors.COUPON_USAGE_LIMIT_REACHED(coupon.code);
            }
          }

          if (coupon.per_user_limit) {
            const [redeemedByUser, heldByUser] = await Promise.all([
              couponRepo.countCouponRedemptionsByUser(trx, coupon.id, user.id),
              orderRepo.countPendingOrdersUsingCoupon(trx, {
                couponId: coupon.id,
                userId: user.id,
                now,
              }),
            ]);
            if (redeemedByUser + heldByUser >= coupon.per_user_limit) {
              throw CommerceErrors.COUPON_USER_LIMIT_REACHED(coupon.code);
            }
          }
        }

        const orderRow = await orderRepo.insertOrder(trx, {
          id: orderId,
          order_number: orderNumber,
          user_id: user.id,
          status: "pending",
          currency: pricing.currency,
          subtotal_amount: pricing.subtotalAmount,
          discount_amount: pricing.discountAmount,
          tax_amount: pricing.taxAmount,
          total_amount: pricing.totalAmount,
          coupon_id: pricing.couponId ?? null,
          idempotency_key: idempotencyKey ?? null,
          expires_at: expiresAt,
          created_at: now,
          updated_at: now,
        });

        const orderItemRows = pricing.items.map((it) => ({
          id: crypto.randomUUID(),
          order_id: orderId,
          item_type: it.itemType,
          course_id: it.itemType === "course" ? it.itemId : null,
          bundle_id: it.itemType === "bundle" ? it.itemId : null,
          quiz_pricing_id: it.itemType === "quiz" ? it.itemId : null,
          title_snapshot: it.title,
          unit_price: it.unitPrice,
          discount_amount: it.discountAmount,
          tax_amount: it.taxAmount,
          final_amount: it.finalAmount,
          created_at: now,
        }));

        await orderRepo.insertOrderItems(trx, orderItemRows);

        let initialPaymentId: string | undefined;

        if (isFreeCheckout) {
          initialPaymentId = crypto.randomUUID();
          await paymentRepo.insertPayment(trx, {
            id: initialPaymentId,
            order_id: orderId,
            gateway_provider: "free",
            gateway_order_id: `free_ord_${orderId}`,
            gateway_payment_id: null,
            gateway_key_id: null,
            amount: 0,
            currency: pricing.currency,
            status: "initiated",
            created_at: now,
            updated_at: now,
          });
        }

        return {
          ...orderRow,
          initialPaymentId,
        };
      });
    }

    // 4. Handle Free Orders vs Paid Gateway Orders
    if (isFreeCheckout && createdOrder.initialPaymentId) {
      // Free order: instantly finalize and fulfill without external gateway call
      await reconciliationService.finalizeSuccessfulPayment({
        paymentId: createdOrder.initialPaymentId,
        gatewayPaymentId: `free_pay_${orderId}`,
        paymentMethod: { method: "free" },
      });

      // Finalizing marked the order paid; `createdOrder` predates it.
      return {
        order: { id: createdOrder.id, status: "paid" },
        gateway: null,
      };
    }

    // 5. External Gateway Call for Paid Orders (executed OUTSIDE the database transaction)
    const { gatewayOrder } = await paymentService
      .initializePayment({
        orderId: createdOrder.id,
        // Inserted by this request a moment ago, so there is nothing to re-read.
        order: createdOrder,
        customer: user,
      })
      .catch(async (error: unknown) => {
        // The gateway did not give this order anything to pay with, and the
        // buyer is told so. Left as it was, the order sat in their purchase
        // history as "processing" for an hour and kept hold of its coupon.
        // Best effort: the gateway's error is the one that matters here.
        await orderRepo
          .cancelOrderWithoutPayment(database, createdOrder.id)
          .catch(() => undefined);
        throw error;
      });

    return {
      order: { id: createdOrder.id, status: createdOrder.status },
      gateway: {
        gatewayOrderId: gatewayOrder.gatewayOrderId,
        keyId: gatewayOrder.keyId,
        amount: gatewayOrder.amount,
        currency: gatewayOrder.currency,
      },
    };
  }

  return {
    previewCheckout,
    createOrder,
  };
}
