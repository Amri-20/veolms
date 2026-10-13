import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MouseEvent } from "react";
import { useParams } from "react-router";
import { BookOpen } from "@phosphor-icons/react/BookOpen";
import { CaretDown } from "@phosphor-icons/react/CaretDown";
import { CircleNotch } from "@phosphor-icons/react/CircleNotch";
import { Heart } from "@phosphor-icons/react/Heart";
import { Play } from "@phosphor-icons/react/Play";
import { ShoppingBag } from "@phosphor-icons/react/ShoppingBag";
import {
  MAX_VOLUNTARY_AMOUNT,
  type Category,
  type CheckoutPreviewResponse,
  type CourseEditorDataResponse,
  type CourseOverviewResponse,
} from "@veolms/contracts";
import {
  getCourseRouteKey,
  type Course,
  type CourseLevel,
  type CourseCategory,
  type CourseLifecycleStatus,
  type CourseRole,
} from "./catalogue";
import {
  checkoutCourseItem,
  describeCouponSaving,
  isCouponTotalStale,
  payableBeforeCoupon,
  type AppliedCoupon,
} from "./couponTotal";
import {
  INVITATION_ONLY_MESSAGE,
  resolveCourseEnrollmentOffer,
} from "./courseEnrollmentOffer";
import { readCustomAmount } from "./customAmountEntry";
import { useCourseWishlisted, useToggleWishlistCourse } from "../wishlist";
import type { CourseSection } from "../learning/courseContent";
import { getCoursePlayerPath } from "../learning/coursePlayerNavigation";
import type { NavigateTo } from "../routing/navigation";
import { productName } from "../routing/routeDescriptors";
import { useAuthStore } from "../store/auth.store";
import { useCourseOverview } from "../services/courses";
import { useEnrolledCourses } from "../services/enrollments";
import { getApiError } from "../lib/api-error";
import {
  readCheckoutStartError,
  useCheckoutPreview,
  useAwaitPaidOrder,
  useCreateCheckoutOrder,
  useVerifyPayment,
} from "../services/payments";
import { DiscussionMarkdown } from "../learning/discussion-editor/DiscussionMarkdown";
import { createDiscussionDraft } from "../learning/discussion-editor/types";
import { formatDuration, resolveCourseDurationSeconds } from "./courseAdapter";
import { CourseLearnerProgressBar } from "./overview/CourseLearnerProgressBar";
import { CourseOverviewCurriculum } from "./overview/CourseOverviewCurriculum";
import {
  CourseOverviewHero,
  overviewColumnClasses,
} from "./overview/CourseOverviewHero";
import { CourseOverviewSkeleton } from "./overview/CourseOverviewSkeleton";
import { CoursePriceBar } from "./overview/CoursePriceBar";
import {
  CourseSupportAmountPicker,
  type ContributionPresetId,
} from "./overview/CourseSupportAmountPicker";
import { formatPriceWithCurrency } from "./overview/coursePriceFormat";

export { CourseOverviewSkeleton };

// ─── Helpers for Currency, Sale Window, Language, and Price Sizing ────────────

export type PriceSizeVariant = "normal" | "medium" | "large" | "xlarge";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

async function loadRazorpay() {
  if (typeof window === "undefined" || window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Unable to load payment checkout."));
    document.head.appendChild(script);
  });
}

export function getPriceSizeVariant(priceStr: string): PriceSizeVariant {
  if (!priceStr || priceStr.toLowerCase() === "free") return "normal";
  const digitsOnly = priceStr.replace(/\D/g, "");
  const digitCount = digitsOnly.length;
  if (digitCount >= 8) return "xlarge";
  if (digitCount >= 6) return "large";
  if (digitCount === 5) return "medium";
  return "normal";
}

export const priceTextClasses: Record<PriceSizeVariant, string> = {
  normal: "text-[2.15rem] max-[640px]:text-[1.95rem] tracking-[-0.03em]",
  medium: "text-[1.95rem] max-[640px]:text-[1.75rem] tracking-[-0.025em]",
  large: "text-[1.75rem] max-[640px]:text-[1.55rem] tracking-[-0.02em]",
  xlarge: "text-[1.55rem] max-[640px]:text-[1.4rem] tracking-[-0.015em]",
};

export function isCourseSaleActive(
  salePrice: number | null | undefined,
  regularPrice: number,
  saleStartsAt?: string | null,
  saleEndsAt?: string | null,
): boolean {
  if (salePrice == null || salePrice <= 0 || salePrice >= regularPrice) {
    return false;
  }
  const now = new Date().getTime();
  if (saleStartsAt) {
    const starts = new Date(saleStartsAt).getTime();
    if (!isNaN(starts) && starts > now) {
      return false;
    }
  }
  if (saleEndsAt) {
    const ends = new Date(saleEndsAt).getTime();
    if (!isNaN(ends) && ends < now) {
      return false;
    }
  }
  return true;
}

export function getLanguageLabel(code?: string | null): string | undefined {
  if (!code || !code.trim()) return undefined;
  const trimmed = code.trim();
  const map: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    hi: "Hindi",
    zh: "Chinese",
    ja: "Japanese",
    ar: "Arabic",
    pt: "Portuguese",
    ru: "Russian",
    it: "Italian",
  };
  return (
    map[trimmed.toLowerCase()] ||
    (trimmed.length <= 3
      ? trimmed.toUpperCase()
      : trimmed.charAt(0).toUpperCase() + trimmed.slice(1))
  );
}

export interface CourseInclude {
  icon: typeof BookOpen;
  label: string;
}

export interface CourseOverviewPricingProps {
  price?: string;
  originalPrice?: string;
  discount?: string;
  /** Catalog charge in major currency units. */
  amount?: number;
  currency?: string;
}

export function isFreeCoursePricing(
  pricing?: CourseOverviewPricingProps | null,
): boolean {
  if (!pricing) return true;
  if (typeof pricing.amount === "number") return pricing.amount <= 0;
  if (!pricing.price) return true;
  const p = pricing.price.trim().toLowerCase();
  if (p === "free" || p === "0") return true;
  return /^(?:[$₹€£]\s*0+(?:\.0+)?|0+(?:\.0+)?)$/.test(p);
}

function toOverviewPricingProps(
  pr?: {
    pricingType: "free" | "paid";
    price: number;
    currency?: string;
    salePrice?: number | null;
  } | null,
): CourseOverviewPricingProps {
  const currency = pr?.currency || "INR";
  if (!pr || pr.pricingType === "free") {
    // A free course that names what it would otherwise cost shows that
    // price struck through beside a price of zero.
    if (pr && pr.price > 0) {
      return {
        price: formatPriceWithCurrency(0, currency),
        originalPrice: formatPriceWithCurrency(pr.price, currency),
        discount: "Free",
        amount: 0,
        currency,
      };
    }
    return { price: "Free", amount: 0, currency };
  }

  const activeSale = isCourseSaleActive(pr.salePrice, pr.price);
  if (activeSale && pr.salePrice != null) {
    const discountPct = Math.round(
      ((pr.price - pr.salePrice) / pr.price) * 100,
    );
    return {
      price: formatPriceWithCurrency(pr.salePrice, currency),
      originalPrice: formatPriceWithCurrency(pr.price, currency),
      discount: `${discountPct}% OFF`,
      amount: pr.salePrice,
      currency,
    };
  }

  return {
    price: formatPriceWithCurrency(pr.price, currency),
    amount: pr.price,
    currency,
  };
}

function appliedCouponFromPreview(
  code: string,
  res: CheckoutPreviewResponse,
  pricedForAmount: number,
): AppliedCoupon {
  const discountAmount = res.pricing.discountAmount;
  const currency = res.pricing.currency || "INR";
  const totalAmount = res.pricing.totalAmount;
  let discountLabel: string | undefined;
  if (res.couponValidation?.discountValue) {
    discountLabel =
      res.couponValidation.discountType === "percentage"
        ? `${res.couponValidation.discountValue}% OFF`
        : `${formatPriceWithCurrency(res.couponValidation.discountValue, currency)} OFF`;
  } else if (discountAmount > 0) {
    discountLabel = `${formatPriceWithCurrency(discountAmount, currency)} OFF`;
  }
  return {
    code,
    discountAmount,
    totalAmount,
    currency,
    discountLabel,
    pricedForAmount,
  };
}

// ─── Price, Coupon & Enrolment ──────────────────────────────────────────────

/**
 * Whether a buyer is offered amounts above the price ("Support Teacher").
 * Switched off for now: the page shows the course's one price. The checkout
 * below still handles a chosen amount, so turning this on brings the picker
 * back as it was.
 */
const SUPPORT_AMOUNTS_OFFERED: boolean = false;

interface CoursePurchaseSectionProps {
  course: Course;
  pricing?: CourseOverviewPricingProps;
  inclusions?: string[];
  onNavigatePage?: NavigateTo;
  isReadOnlyPreview?: boolean;
  isCreator?: boolean;
  /** The overview's `canSelfEnroll`; only `false` closes enrolment. */
  canSelfEnroll?: boolean;
}

function CoursePurchaseSection({
  course,
  pricing,
  inclusions,
  onNavigatePage,
  isReadOnlyPreview = false,
  isCreator = false,
  canSelfEnroll,
}: CoursePurchaseSectionProps) {
  const user = useAuthStore((state) => state.user);
  const preview = useCheckoutPreview();
  const createOrder = useCreateCheckoutOrder();
  const checkoutIntentRef = useRef<{ intent: string; key: string } | null>(
    null,
  );
  const verify = useVerifyPayment();
  const awaitPaidOrder = useAwaitPaidOrder();
  const paymentConfirmationRef = useRef<AbortController | null>(null);
  useEffect(() => () => paymentConfirmationRef.current?.abort(), []);
  const isEnrolled = Boolean(user && course.enrolled);

  const [isPaymentBusy, setIsPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);

  const [selectedPreset, setSelectedPreset] =
    useState<ContributionPresetId>("0");
  const [voluntaryAmount, setVoluntaryAmount] = useState<number>(0);
  const [customAmountInput, setCustomAmountInput] = useState<string>("");
  const [customAmountError, setCustomAmountError] = useState<string | null>(
    null,
  );

  const [couponInputOpen, setCouponInputOpen] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(
    null,
  );

  const courseCurrency = pricing?.currency ?? "INR";
  const baseNumericPrice = pricing?.amount ?? 0;
  const isPreview = Boolean(isReadOnlyPreview);
  const isCreatorNormal = Boolean(isCreator && !isPreview);
  const isFree = isFreeCoursePricing(pricing);
  // A restricted course with no price is entered by a grant from staff and
  // checkout refuses it, so the card offers no enrolment, amount or coupon
  // for it: one line says how the course is entered.
  const isInvitationOnly =
    resolveCourseEnrollmentOffer({
      managesCourse: isCreatorNormal,
      isPreview,
      isEnrolled,
      isFree,
      canSelfEnroll,
    }) === "invitation-only";

  const checkoutItem = useMemo(
    () =>
      checkoutCourseItem(course.id, {
        isFree,
        amount: voluntaryAmount,
        catalogPrice: baseNumericPrice,
      }),
    [course.id, isFree, voluntaryAmount, baseNumericPrice],
  );

  // What a payment would charge before the coupon, and whether the coupon
  // total on the card was worked out for it. Both are read during render, so
  // the pay button is already held on the render that follows a change of
  // amount; it does not wait for the effect below.
  const payableAmount = payableBeforeCoupon(voluntaryAmount, baseNumericPrice);
  const couponTotalIsStale =
    !isFree && isCouponTotalStale(appliedCoupon, payableAmount);
  const appliedCouponCode = appliedCoupon?.code;
  // `preview` is a new object on every render, and starting the request
  // causes a render. As a dependency it cancelled the effect's own request,
  // so the answer was dropped and the old total stayed. The function is the
  // same one for the life of the component.
  const previewCheckout = preview.mutateAsync;
  useEffect(() => {
    if (!appliedCouponCode || !couponTotalIsStale) return;

    let cancelled = false;
    const handle = window.setTimeout(async () => {
      try {
        const res = await previewCheckout({
          items: [checkoutItem],
          couponCode: appliedCouponCode,
        });
        if (cancelled) return;
        if (res.couponValidation && !res.couponValidation.valid) {
          setAppliedCoupon(null);
          setCouponError(
            res.couponValidation.message ||
              "Coupon is no longer valid for this amount.",
          );
          return;
        }
        setAppliedCoupon(
          appliedCouponFromPreview(appliedCouponCode, res, payableAmount),
        );
      } catch (err) {
        if (cancelled) return;
        // The total for this amount is unknown. The coupon comes off so the
        // button names a price that is known, and the reason is shown.
        setAppliedCoupon(null);
        setCouponError(
          `The coupon was removed because its total for this amount could not be worked out. ${getApiError(err).message}`,
        );
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [
    appliedCouponCode,
    checkoutItem,
    couponTotalIsStale,
    payableAmount,
    previewCheckout,
  ]);

  const basePrice = pricing?.price ?? "Free";
  const displayPrice = appliedCoupon
    ? appliedCoupon.totalAmount === 0
      ? "Free"
      : formatPriceWithCurrency(
          appliedCoupon.totalAmount,
          appliedCoupon.currency,
        )
    : voluntaryAmount > 0 && voluntaryAmount > baseNumericPrice
      ? formatPriceWithCurrency(voluntaryAmount, courseCurrency)
      : basePrice;
  // The headline is then the buyer's own, higher amount. The catalogue's
  // "was" price and "% OFF" badge describe the regular price, and next to a
  // chosen amount they claimed a discount that is not being given.
  const isPayingAbovePrice =
    !isFree &&
    !appliedCoupon &&
    voluntaryAmount > 0 &&
    voluntaryAmount > baseNumericPrice;
  const originalPrice = isPayingAbovePrice ? undefined : pricing?.originalPrice;
  const discount = isPayingAbovePrice ? undefined : pricing?.discount;
  // With a coupon, what the total is compared with. On the buyer's own,
  // higher amount the catalogue price and the coupon's "% OFF" are both the
  // wrong comparison (see `describeCouponSaving`).
  const couponSaving =
    !isFree && appliedCoupon
      ? describeCouponSaving(appliedCoupon, baseNumericPrice)
      : null;
  const struckThroughPrice =
    !couponSaving || !appliedCoupon
      ? originalPrice
      : couponSaving.against === "catalogue"
        ? basePrice
        : couponSaving.against === "ownAmount"
          ? formatPriceWithCurrency(
              couponSaving.wasAmount,
              appliedCoupon.currency,
            )
          : undefined;
  const displayDiscount = !appliedCoupon
    ? discount
    : couponSaving?.against === "ownAmount"
      ? `${formatPriceWithCurrency(couponSaving.savedAmount, appliedCoupon.currency)} OFF`
      : couponSaving?.against === "nothing"
        ? undefined
        : appliedCoupon.discountLabel ||
          `${formatPriceWithCurrency(appliedCoupon.discountAmount, appliedCoupon.currency)} OFF`;
  const perksList = inclusions ?? [
    "Full lifetime access",
    "Access on mobile & desktop",
    "Certificate of completion",
  ];
  const priceSizeVariant = getPriceSizeVariant(displayPrice);

  const handleApplyCoupon = async () => {
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) return;
    setCouponBusy(true);
    setCouponError(null);

    try {
      const res = await preview.mutateAsync({
        items: [checkoutItem],
        couponCode: code,
      });

      if (res.couponValidation && !res.couponValidation.valid) {
        setCouponError(res.couponValidation.message || "Invalid coupon code.");
        return;
      }

      // `payableAmount` is the amount this request was made for. If the
      // buyer changed theirs while it was in flight, the total is stale on
      // arrival and the effect above asks again.
      setAppliedCoupon(appliedCouponFromPreview(code, res, payableAmount));
      setCouponInputOpen(false);
      setCouponCodeInput("");
    } catch (err) {
      setCouponError(getApiError(err).message);
    } finally {
      setCouponBusy(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
    setCouponCodeInput("");
  };

  const confirmPaidOrder = async (orderId: string) => {
    paymentConfirmationRef.current?.abort();
    const confirmation = new AbortController();
    paymentConfirmationRef.current = confirmation;

    setPaymentError(null);
    setPaymentNotice(
      "Payment received. We are confirming your access — this can take a few minutes. Please do not pay again.",
    );
    setIsPaymentBusy(true);

    const paid = await awaitPaidOrder(orderId, confirmation.signal);
    if (confirmation.signal.aborted) return;
    paymentConfirmationRef.current = null;

    setPaymentNotice(null);
    setIsPaymentBusy(false);
    if (paid) {
      onNavigatePage?.(
        `/learn/${encodeURIComponent(getCourseRouteKey(course))}`,
      );
      return;
    }
    setPaymentError(
      "Your payment was received, but confirming it is taking longer than usual. Your course will unlock automatically — check Purchase History in a few minutes. Please do not pay again.",
    );
  };

  const handlePayNow = async (voluntaryContributionAmount?: number) => {
    if (isReadOnlyPreview) return;
    if (!user) {
      // Opens the login pop-up over this course page, so the visitor is back
      // on the price card as soon as they are signed in.
      if (onNavigatePage) onNavigatePage("/login");
      else setPaymentError("Please log in before enrolling.");
      return;
    }

    setIsPaymentBusy(true);
    setPaymentError(null);

    try {
      const item = checkoutCourseItem(course.id, {
        isFree,
        amount: voluntaryContributionAmount ?? 0,
        catalogPrice: baseNumericPrice,
      });
      const coupon = appliedCoupon?.code?.trim();
      const couponCode = !isFree && coupon ? coupon.toUpperCase() : undefined;
      // The key identifies this purchase, not this click: a second click on
      // the same course, amount and coupon must reach the same order. A new
      // key per click made the server see every retry as a new purchase.
      const intent = JSON.stringify([item, couponCode ?? null]);
      if (checkoutIntentRef.current?.intent !== intent) {
        checkoutIntentRef.current = { intent, key: crypto.randomUUID() };
      }
      const order = await createOrder.mutateAsync({
        items: [item],
        ...(couponCode ? { couponCode } : {}),
        idempotencyKey: checkoutIntentRef.current.key,
      });

      if (!order.gateway) {
        setIsPaymentBusy(false);
        onNavigatePage?.(
          `/learn/${encodeURIComponent(getCourseRouteKey(course))}`,
        );
        return;
      }

      // The same purchase was already paid — an earlier attempt whose
      // confirmation did not reach this page. Opening the gateway again would
      // invite a second payment for an order that is complete.
      if (order.order.status === "paid") {
        await confirmPaidOrder(order.order.id);
        return;
      }

      await loadRazorpay();
      if (!window.Razorpay) {
        throw new Error("Payment checkout is unavailable.");
      }

      const rzp = new window.Razorpay({
        key: order.gateway.keyId,
        amount: order.gateway.amount,
        currency: order.gateway.currency,
        name: productName,
        description:
          (voluntaryContributionAmount ?? 0) > baseNumericPrice ||
          (isFree && (voluntaryContributionAmount ?? 0) > 0)
            ? `Support Creator - ${course.title}`
            : course.title,
        order_id: order.gateway.gatewayOrderId,
        prefill: {
          name: user.displayName || user.username,
          email: user.email,
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verify.mutateAsync({
              orderId: order.order.id,
              gatewayOrderId: response.razorpay_order_id,
              gatewayPaymentId: response.razorpay_payment_id,
              gatewaySignature: response.razorpay_signature,
            });
            setIsPaymentBusy(false);
            onNavigatePage?.(
              `/learn/${encodeURIComponent(getCourseRouteKey(course))}`,
            );
          } catch {
            // The gateway has taken the payment; only our confirmation call
            // failed. The server still fulfils the order from the gateway
            // webhook or its recovery cycle, so wait for that rather than
            // telling the learner to pay again.
            await confirmPaidOrder(order.order.id);
          }
        },
        modal: {
          ondismiss: () => {
            // A payment that went through is being confirmed; the gateway
            // closing its own window afterwards is not a cancellation.
            const confirmation = paymentConfirmationRef.current;
            if (confirmation && !confirmation.signal.aborted) return;
            setPaymentError("Payment cancelled. You can retry.");
            setIsPaymentBusy(false);
          },
        },
      });

      rzp.open();
    } catch (error) {
      setPaymentError(
        readCheckoutStartError(
          error,
          "Checkout could not be started. Please retry.",
        ),
      );
      setIsPaymentBusy(false);
    }
  };

  // The price stands on the bar beside the button, so the button does not
  // repeat it. A buyer's own, higher amount is still named, and so is a
  // coupon that leaves nothing to pay.
  const paidCtaLabel = (payable: number, currency: string) =>
    voluntaryAmount > baseNumericPrice
      ? `Pay ${formatPriceWithCurrency(payable, currency)} & Enroll`
      : payable === 0
        ? "Enroll for Free"
        : "Buy Now";

  let ctaLabel = "Continue Learning";
  let ctaIcon: React.ReactNode = (
    <Play size="1.15em" weight="fill" className="shrink-0" aria-hidden="true" />
  );
  let ctaDisabled = false;
  let ctaOnClick: (() => void) | undefined = () => {
    if (onNavigatePage) {
      onNavigatePage(`/learn/${encodeURIComponent(getCourseRouteKey(course))}`);
    }
  };

  // An enrolled student has nothing left to buy; offering a coupon next to
  // "Continue Learning" suggested there was still something to pay for.
  const showApplyCoupon =
    !isCreatorNormal && !isFree && !isEnrolled && !isInvitationOnly;
  const isCustomUnderPrice =
    !isFree &&
    selectedPreset === "custom" &&
    voluntaryAmount > 0 &&
    voluntaryAmount < baseNumericPrice;
  // The custom box holds something that is not a whole number ("199.50",
  // "1e5", "abc"). It stays in the box as typed and nothing can be paid or
  // enrolled until it is corrected: the amount is 0 meanwhile, and paying
  // the catalogue price next to a box that says otherwise would be a
  // different mistake.
  const isCustomAmountUnreadable =
    selectedPreset === "custom" &&
    readCustomAmount(customAmountInput, MAX_VOLUNTARY_AMOUNT).kind ===
      "unreadable";
  // Why the amount in the custom box cannot be used. The pay button is
  // disabled for an unreadable amount and for one under the price; without
  // this nothing said why. Derived from the box, so it stays for as long as
  // the box is wrong.
  const customAmountMessage =
    selectedPreset !== "custom"
      ? null
      : isCustomAmountUnreadable
        ? "Enter a whole number, with no decimals or symbols."
        : (customAmountError ??
          (isCustomUnderPrice
            ? `The least you can pay for this course is ${formatPriceWithCurrency(baseNumericPrice, courseCurrency)}.`
            : null));

  if (isCreatorNormal || isEnrolled) {
    // 1. Creator viewing their course normally or already enrolled student:
    // Show only "Continue Learning". Clicking it opens the course player.
    // Do not show Pay Now or Apply Coupon.
    ctaLabel = "Continue Learning";
    ctaIcon = (
      <Play
        size="1.15em"
        weight="fill"
        className="shrink-0"
        aria-hidden="true"
      />
    );
    ctaDisabled = false;
    ctaOnClick = () => {
      if (onNavigatePage) {
        onNavigatePage(
          `/learn/${encodeURIComponent(getCourseRouteKey(course))}`,
        );
      }
    };
  } else if (isPreview) {
    // 2. Creator Preview:
    if (isFree) {
      if (voluntaryAmount > 0) {
        ctaLabel = `Pay ${formatPriceWithCurrency(voluntaryAmount, courseCurrency)} & Enroll`;
        ctaIcon = (
          <Heart
            size="1.15em"
            weight="fill"
            className="shrink-0 text-rose-300"
            aria-hidden="true"
          />
        );
      } else {
        ctaLabel = "Enroll for Free";
        ctaIcon = (
          <BookOpen
            size="1.15em"
            weight="bold"
            className="shrink-0"
            aria-hidden="true"
          />
        );
      }
    } else {
      const payable =
        voluntaryAmount > baseNumericPrice ? voluntaryAmount : baseNumericPrice;
      ctaLabel = paidCtaLabel(payable, courseCurrency);
      ctaIcon = (
        <ShoppingBag
          size="1.15em"
          weight="bold"
          className="shrink-0"
          aria-hidden="true"
        />
      );
    }
    ctaDisabled = false;
    ctaOnClick = undefined; // Preview actions stay non-functional.
  } else {
    // 3. Student / Learner (not yet enrolled):
    if (isFree) {
      if (voluntaryAmount > 0) {
        ctaLabel = isPaymentBusy
          ? "Processing…"
          : `Pay ${formatPriceWithCurrency(voluntaryAmount, courseCurrency)} & Enroll`;
        ctaIcon = isPaymentBusy ? (
          <CircleNotch
            size="1.15em"
            className="animate-spin shrink-0"
            aria-hidden="true"
          />
        ) : (
          <Heart
            size="1.15em"
            weight="fill"
            className="shrink-0 text-rose-300"
            aria-hidden="true"
          />
        );
        ctaDisabled = isPaymentBusy;
        ctaOnClick = () => handlePayNow(voluntaryAmount);
      } else {
        ctaLabel = isPaymentBusy ? "Enrolling…" : "Enroll for Free";
        ctaIcon = isPaymentBusy ? (
          <CircleNotch
            size="1.15em"
            className="animate-spin shrink-0"
            aria-hidden="true"
          />
        ) : (
          <BookOpen
            size="1.15em"
            weight="bold"
            className="shrink-0"
            aria-hidden="true"
          />
        );
        ctaDisabled = isPaymentBusy;
        ctaOnClick = () => handlePayNow(0);
      }
    } else {
      const payable =
        voluntaryAmount > baseNumericPrice ? voluntaryAmount : baseNumericPrice;
      const finalPayable = appliedCoupon ? appliedCoupon.totalAmount : payable;
      ctaLabel = isPaymentBusy
        ? "Processing…"
        : paidCtaLabel(finalPayable, appliedCoupon?.currency ?? courseCurrency);
      ctaIcon = isPaymentBusy ? (
        <CircleNotch
          size="1.15em"
          className="animate-spin shrink-0"
          aria-hidden="true"
        />
      ) : (
        <ShoppingBag
          size="1.15em"
          weight="bold"
          className="shrink-0"
          aria-hidden="true"
        />
      );
      ctaDisabled = isPaymentBusy || isCustomUnderPrice;
      ctaOnClick = () => {
        if (isCustomUnderPrice) {
          setPaymentError(
            `Amount cannot be less than the course price (${formatPriceWithCurrency(baseNumericPrice, courseCurrency)}).`,
          );
          return;
        }
        handlePayNow(
          voluntaryAmount > baseNumericPrice ? voluntaryAmount : undefined,
        );
      };
    }

    // Free or paid: no payment and no enrolment while the custom box holds
    // text that is not an amount. The message under the box says why.
    if (isCustomAmountUnreadable) {
      ctaDisabled = true;
      ctaOnClick = undefined;
    }

    // The coupon total on the card belongs to an earlier amount, and the one
    // for the amount now chosen has been asked for. Until it arrives the
    // button names no price and takes no payment: a click here used to send
    // the new amount under the old total. It ends when the new total
    // arrives, or when the coupon comes off because it could not be had.
    if (couponTotalIsStale) {
      ctaDisabled = true;
      ctaOnClick = undefined;
      if (!isPaymentBusy) {
        ctaLabel = "Updating total…";
        ctaIcon = (
          <CircleNotch
            size="1.15em"
            className="animate-spin shrink-0"
            aria-hidden="true"
          />
        );
      }
    }
  }

  const priceLabel = isFree
    ? originalPrice
      ? basePrice
      : "Free"
    : displayPrice;
  const priceBadge =
    (isFree ? originalPrice : true) && displayDiscount
      ? displayDiscount
      : undefined;

  return (
    <CoursePriceBar
      price={
        isCreatorNormal
          ? undefined
          : {
              label: priceLabel,
              sizeClassName: priceTextClasses[priceSizeVariant],
              struckThrough: struckThroughPrice,
              badge: priceBadge,
            }
      }
      coupon={
        appliedCoupon || showApplyCoupon
          ? {
              applied: appliedCoupon
                ? {
                    code: appliedCoupon.code,
                    discountLabel: appliedCoupon.discountLabel,
                  }
                : null,
              isOpen: couponInputOpen,
              code: couponCodeInput,
              busy: couponBusy,
              onOpen: () => {
                setCouponInputOpen(true);
                setCouponError(null);
              },
              onClose: () => {
                setCouponInputOpen(false);
                setCouponError(null);
              },
              onCodeChange: (code) => {
                setCouponCodeInput(code);
                setCouponError(null);
              },
              onApply: handleApplyCoupon,
              onRemove: handleRemoveCoupon,
            }
          : undefined
      }
      // Shown under the open box, and also when the box is closed: a coupon
      // that came off by itself would otherwise give no reason at all.
      couponError={appliedCoupon ? null : couponError}
      action={{
        label: ctaLabel,
        icon: ctaIcon,
        disabled: ctaDisabled,
        onClick: ctaOnClick,
      }}
      closedMessage={isInvitationOnly ? INVITATION_ONLY_MESSAGE : undefined}
      notice={paymentNotice}
      error={paymentError}
      onDismissError={() => setPaymentError(null)}
      perks={perksList}
    >
      {SUPPORT_AMOUNTS_OFFERED &&
      !isCreatorNormal &&
      !isEnrolled &&
      !isInvitationOnly ? (
        <CourseSupportAmountPicker
          isFree={isFree}
          basePrice={baseNumericPrice}
          currency={courseCurrency}
          selectedPreset={selectedPreset}
          voluntaryAmount={voluntaryAmount}
          customAmountInput={customAmountInput}
          customAmountMessage={customAmountMessage}
          onSelectPreset={setSelectedPreset}
          onVoluntaryAmountChange={setVoluntaryAmount}
          onCustomAmountInputChange={setCustomAmountInput}
          onCustomAmountErrorChange={setCustomAmountError}
        />
      ) : null}
    </CoursePriceBar>
  );
}

interface CourseAboutCardProps {
  description?: string;
  isReadOnlyPreview?: boolean;
}

/** Line height × clamp lines = collapsed max-height in px. */
const CLAMP_LINES = 5;
const LINE_HEIGHT_PX = 0.88 * 16 * 1.65; // font-size × line-height ≈ 23.2 px

function CourseAboutCard({ description }: CourseAboutCardProps) {
  const hasDescription = Boolean(description && description.trim());
  const [expanded, setExpanded] = useState(false);
  const [needsClamp, setNeedsClamp] = useState(() => {
    if (!description) return false;
    return (
      description.split("\n").length > CLAMP_LINES || description.length > 250
    );
  });
  const contentRef = (node: HTMLDivElement | null) => {
    if (!node) return;
    const collapsedMax = Math.round(LINE_HEIGHT_PX * CLAMP_LINES);
    setNeedsClamp(node.scrollHeight > collapsedMax + 4);
  };

  const collapsedMaxHeight = `${Math.round(LINE_HEIGHT_PX * CLAMP_LINES)}px`;

  return (
    <section
      className="p-[18px_24px] rounded-xl border border-[color-mix(in_srgb,var(--text)_10%,transparent)] bg-(--surface) shadow-(--card-shadow) max-[640px]:p-[18px_16px]"
      aria-labelledby="cov-about-heading"
    >
      <h2
        id="cov-about-heading"
        className="m-0 mb-3 text-(--text) text-[1.24rem] font-bold tracking-[-0.015em]"
      >
        About this course
      </h2>

      {hasDescription ? (
        <div className="flex flex-col gap-2">
          {/* Clamp wrapper */}
          <div className="relative">
            <div
              ref={contentRef}
              className="cov-prose text-[0.88rem] leading-[1.65] overflow-hidden transition-[max-height] duration-300 ease-in-out"
              style={{
                maxHeight:
                  needsClamp && !expanded ? collapsedMaxHeight : "9999px",
              }}
            >
              <DiscussionMarkdown
                content={createDiscussionDraft(description!.trim())}
                label="About this course"
                // The description is written with single line breaks; they
                // are kept as lines instead of being run into one paragraph.
                preserveSoftBreaks
                className="[&>:first-child]:mt-0 max-w-none"
              />
            </div>

            {/* Gradient fade — only shown when collapsed and clamp is active */}
            {needsClamp && !expanded && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-(--surface) to-transparent"
              />
            )}
          </div>

          {/* Toggle button */}
          {needsClamp && (
            <button
              type="button"
              data-testid="description-toggle"
              onClick={() => setExpanded((prev) => !prev)}
              className="self-start flex items-center gap-1.5 text-[0.82rem] font-semibold text-(--accent) hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-0 p-0"
            >
              {expanded ? (
                <>
                  See less
                  <CaretDown
                    size={13}
                    weight="bold"
                    className="rotate-180 transition-transform duration-200"
                  />
                </>
              ) : (
                <>
                  See more
                  <CaretDown
                    size={13}
                    weight="bold"
                    className="transition-transform duration-200"
                  />
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <div
          className="p-8 rounded-xl border border-[color-mix(in_srgb,var(--text)_10%,transparent)] bg-(--surface) text-(--muted) text-center text-[0.88rem] italic"
          data-testid="course-description-empty"
        >
          No description available yet
        </div>
      )}
    </section>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export interface CourseOverviewPageProps {
  courseSlug?: string | undefined;
  initialOverview?: CourseOverviewResponse;
  onNavigateCourses?: () => void;
  /** The menu page the back link returns to, as the menu names it. */
  backSection?: string;
  onNavigatePage?: NavigateTo;
  onSelectLesson?: (lessonNumber: number) => void;
  role?: CourseRole;
  isCreator?: boolean;
  isPaidCourse?: boolean;
  // API Preview Data
  previewData?: CourseEditorDataResponse;
  categories?: Category[];
  // Custom overview data override for backwards compatibility or tests
  customCourse?: Course;
  customInstructor?: string;
  customDescription?: string;
  customShortDescription?: string;
  customCategoryName?: string;
  customLanguage?: string;
  customSections?: CourseSection[];
  customIncludes?: CourseInclude[];
  customInclusions?: string[];
  customPricing?: CourseOverviewPricingProps;
  customTrailerMediaId?: string | null;
  isReadOnlyPreview?: boolean;
}

export interface AdaptedOverviewData {
  course: Course;
  description: string;
  shortDescription: string | undefined;
  categoryName: string | undefined;
  language: string | undefined;
  sections: CourseSection[];
  inclusions: string[];
  pricing: CourseOverviewPricingProps;
  instructorName: string | undefined;
  trailerMediaId: string | null;
  /**
   * The overview's `canSelfEnroll`. Absent for the editor's preview, which
   * is built from the course's saved settings rather than from an overview.
   */
  canSelfEnroll?: boolean;
}

export function adaptCourseOverviewResponse(
  overview: CourseOverviewResponse,
  defaultInstructorName: string,
): AdaptedOverviewData {
  const c = overview.course;
  const totalSections =
    overview.stats?.totalSections ?? overview.sections.length;
  const totalLessons =
    overview.stats?.totalLessons ??
    overview.sections.reduce((acc, sec) => acc + (sec.lessons?.length ?? 0), 0);

  const difficultyStr = c.difficulty
    ? c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1)
    : "";

  const resolvedCategoryName = overview.category?.name;
  const resolvedLanguage = getLanguageLabel(overview.settings?.language);

  const showInstructor = overview.settings?.showInstructorName !== false;
  const resolvedInstructorName = showInstructor
    ? c.instructorAlias?.trim() ||
      overview.creator?.displayName ||
      defaultInstructorName
    : undefined;

  const resolvedDurationSeconds = resolveCourseDurationSeconds(
    overview.stats?.totalDurationSeconds,
    overview.settings?.estimatedDuration,
  );
  const resolvedDuration = formatDuration(resolvedDurationSeconds);

  const resolvedThumbnail = c.thumbnailUrl || "";

  const adaptedCourse: Course = {
    id: c.id,
    slug: c.slug,
    title: c.title || "Untitled Course",
    description: c.description || c.shortDescription || "",
    level: (difficultyStr || "Beginner") as CourseLevel,
    category: (resolvedCategoryName || "Development") as CourseCategory,
    sections: totalSections,
    lectures: totalLessons,
    progress: null,
    enrolled: false,
    duration: resolvedDuration,
    students: 0,
    thumbnail: resolvedThumbnail,
    thumbnailSrcSet: c.thumbnailSrcSet,
    lifecycleStatus: (c.status === "published"
      ? "published"
      : "draft") as CourseLifecycleStatus,
    creatorId: c.creatorId ?? overview.creator?.id ?? null,
  };

  let sequentialLessonIndex = 1;
  const adaptedSections: CourseSection[] = (overview.sections || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((sec, secIdx) => ({
      id: secIdx + 1,
      title: sec.title || `Section ${secIdx + 1}`,
      progress: `0/${sec.lessons?.length ?? 0}`,
      lessons: (sec.lessons || [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((les) => {
          const lessonNumber = sequentialLessonIndex++;
          return [
            lessonNumber,
            les.title || `Lesson ${lessonNumber}`,
            les.durationSeconds && les.durationSeconds > 0
              ? formatDuration(les.durationSeconds)
              : "",
            "todo" as const,
            les.isPreview,
            les.contentType ?? "video",
          ];
        }),
    }));

  const finalPerks: string[] = Array.isArray(overview.includes)
    ? overview.includes
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((inc) => inc.text.trim())
        .filter(Boolean)
        .slice(0, 6)
    : [];

  let pricingProps: CourseOverviewPricingProps = toOverviewPricingProps(
    overview.pricing,
  );

  return {
    course: adaptedCourse,
    description: c.description || "",
    shortDescription: c.shortDescription?.trim() || undefined,
    categoryName: resolvedCategoryName,
    language: resolvedLanguage,
    sections: adaptedSections,
    inclusions: finalPerks,
    pricing: pricingProps,
    instructorName: resolvedInstructorName,
    trailerMediaId: c.trailerMediaId ?? null,
    canSelfEnroll: overview.canSelfEnroll,
  };
}

export function adaptPreviewDataToOverview(
  previewData: CourseEditorDataResponse,
  serverCategories: Category[],
  defaultInstructorName: string,
): AdaptedOverviewData {
  const c = previewData.course;
  const totalSections = previewData.sections.length;
  const totalLessons = previewData.sections.reduce(
    (acc, sec) => acc + (sec.lessons?.length ?? 0),
    0,
  );

  const difficultyStr = c.difficulty
    ? c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1)
    : "";

  const resolvedCategoryName = c.categoryId
    ? serverCategories.find((cat) => cat.id === c.categoryId)?.name
    : undefined;

  const resolvedLanguage = getLanguageLabel(previewData.settings?.language);

  const showInstructor = previewData.settings?.showInstructorName !== false;
  const resolvedInstructorName = showInstructor
    ? c.instructorAlias?.trim() || defaultInstructorName
    : undefined;

  const totalDurationSeconds = resolveCourseDurationSeconds(
    previewData.course.totalDurationSeconds,
    previewData.settings?.estimatedDuration,
  );

  const adaptedCourse: Course = {
    id: c.id,
    slug: c.slug,
    title: c.title || "Untitled Course",
    description: c.description || "",
    level: (difficultyStr || "Beginner") as CourseLevel,
    category: (resolvedCategoryName || "") as CourseCategory,
    sections: totalSections,
    lectures: totalLessons,
    progress: null,
    enrolled: false,
    duration: formatDuration(totalDurationSeconds),
    students: 0,
    thumbnail: c.thumbnailUrl || "",
    thumbnailSrcSet: c.thumbnailSrcSet,
    lifecycleStatus: (c.status === "published"
      ? "published"
      : "draft") as CourseLifecycleStatus,
    creatorId: c.creatorId ?? null,
  };

  let sequentialLessonIndex = 1;
  const adaptedSections: CourseSection[] = (previewData.sections || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((sec, secIdx) => ({
      id: secIdx + 1,
      title: sec.title || `Section ${secIdx + 1}`,
      progress: `0/${sec.lessons?.length ?? 0}`,
      lessons: (sec.lessons || [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((les) => {
          const lessonNumber = sequentialLessonIndex++;
          return [
            lessonNumber,
            les.title || `Lesson ${lessonNumber}`,
            les.durationSeconds && les.durationSeconds > 0
              ? formatDuration(les.durationSeconds)
              : "",
            "todo" as const,
            les.isPreview,
            les.contentType ?? "video",
          ];
        }),
    }));

  const finalPerks: string[] = Array.isArray(previewData.includes)
    ? previewData.includes
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((inc) => inc.text.trim())
        .filter(Boolean)
        .slice(0, 6)
    : [];

  const pricingProps: CourseOverviewPricingProps = toOverviewPricingProps(
    previewData.pricing,
  );

  return {
    course: adaptedCourse,
    description: c.description || "",
    shortDescription: c.shortDescription?.trim() || undefined,
    categoryName: resolvedCategoryName,
    language: resolvedLanguage,
    sections: adaptedSections,
    inclusions: finalPerks,
    pricing: pricingProps,
    instructorName: resolvedInstructorName,
    trailerMediaId: c.trailerMediaId ?? null,
  };
}

export function CourseOverviewPage(props: CourseOverviewPageProps) {
  const { courseSlug: routeCourseSlug } = useParams();
  const courseSlug = props.courseSlug ?? routeCourseSlug;
  const serverCategories = props.categories ?? [];
  const authUser = useAuthStore((s) => s.user);
  const defaultInstructorName =
    authUser?.displayName || authUser?.username || "Instructor";

  // The prerendered overview belongs to the page that was first loaded. It
  // is passed down for every course route afterwards, so use it only for
  // its own course: seeding another route with it showed the first course's
  // title, price and curriculum there — and its Pay button bought it.
  const seededOverview =
    props.initialOverview &&
    courseSlug &&
    (props.initialOverview.course.slug === courseSlug ||
      props.initialOverview.course.id === courseSlug)
      ? props.initialOverview
      : undefined;

  const {
    data: apiOverview,
    isLoading: isOverviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useCourseOverview(courseSlug, {
    // A seeded (prerendered) overview is still fetched once: it is shown at
    // once and then corrected if the course changed since the build.
    enabled: !props.previewData && !props.customCourse && Boolean(courseSlug),
    initialData: seededOverview,
  });

  // If previewData is provided, adapt it cleanly from persisted server state
  const adaptedFromPreview = props.previewData
    ? adaptPreviewDataToOverview(
        props.previewData,
        serverCategories,
        defaultInstructorName,
      )
    : null;

  const adaptedFromOverview = apiOverview
    ? adaptCourseOverviewResponse(apiOverview, defaultInstructorName)
    : null;

  const activeAdapted = adaptedFromPreview ?? adaptedFromOverview;

  const course = activeAdapted?.course ?? props.customCourse;

  const { data: enrolledData } = useEnrolledCourses({
    enabled: Boolean(authUser) && props.role !== "creator",
  });

  const enrolledCourse = useMemo(
    () =>
      enrolledData?.courses.find(
        (ec) =>
          ec.courseId === course?.id ||
          ec.courseSlug === courseSlug ||
          (course?.slug && ec.courseSlug === course.slug),
      ),
    [enrolledData, course, courseSlug],
  );

  const courseWithEnrollment = useMemo(() => {
    if (!course) return undefined;
    return {
      ...course,
      enrolled: Boolean(enrolledCourse) || course.enrolled,
      progress: enrolledCourse?.progress ?? course.progress,
    };
  }, [course, enrolledCourse]);

  if (
    isOverviewLoading &&
    !course &&
    !props.previewData &&
    !props.customCourse
  ) {
    return (
      <CourseOverviewSkeleton
        onNavigateCourses={props.onNavigateCourses}
        heroPlacement={props.isReadOnlyPreview ? "card" : "edge"}
      />
    );
  }

  // A failed request is not a missing course. Saying "not found" for a
  // dropped connection or a server error told people a course they own
  // had been removed.
  if (!courseWithEnrollment && overviewError && overviewError.status !== 404) {
    return (
      <div className="w-full max-w-275 mx-auto box-border text-(--text)">
        <div className="courses-empty" role="alert">
          <BookOpen size={34} />
          <h2>This course could not be loaded</h2>
          <p>Check your connection and try again.</p>
          <button type="button" onClick={() => void refetchOverview()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!courseWithEnrollment) {
    return (
      <div className="w-full max-w-275 mx-auto box-border text-(--text)">
        <div className="courses-empty">
          <BookOpen size={34} />
          <h2>Course not found</h2>
          <p>
            The course you are looking for does not exist or may have been
            removed.
          </p>
          {props.onNavigateCourses ? (
            <button type="button" onClick={props.onNavigateCourses}>
              Explore courses
            </button>
          ) : props.onNavigatePage ? (
            <button
              type="button"
              onClick={() => props.onNavigatePage?.("/courses")}
            >
              Explore courses
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const isCourseOwner = Boolean(
    authUser?.id &&
    (course?.creatorId === authUser.id ||
      activeAdapted?.course.creatorId === authUser.id ||
      apiOverview?.creator?.id === authUser.id ||
      apiOverview?.course.creatorId === authUser.id),
  );

  const isCreator =
    props.isCreator ??
    (props.role === "creator"
      ? true
      : props.role === "student"
        ? false
        : isCourseOwner);

  return (
    <CourseOverviewContent
      {...props}
      key={courseWithEnrollment.id}
      course={courseWithEnrollment}
      courseSlug={courseSlug}
      adaptedFromPreview={activeAdapted}
      isCreator={isCreator}
    />
  );
}

type CourseOverviewContentProps = CourseOverviewPageProps & {
  course: Course;
  courseSlug: string | undefined;
  adaptedFromPreview: AdaptedOverviewData | null;
  isCreator?: boolean;
};

function CourseOverviewContent({
  course,
  courseSlug,
  adaptedFromPreview,
  onNavigateCourses,
  backSection,
  onNavigatePage,
  onSelectLesson,
  customCourse,
  customDescription,
  customShortDescription,
  customSections,
  customIncludes,
  customInclusions,
  customPricing,
  customTrailerMediaId,
  isReadOnlyPreview = false,
  isCreator = false,
  isPaidCourse: propIsPaidCourse,
}: CourseOverviewContentProps) {
  const user = useAuthStore((state) => state.user);
  const handleSelectLesson = (lessonNumber: number) => {
    if (isReadOnlyPreview) return;
    onSelectLesson?.(lessonNumber);
    if (!onNavigatePage) return;
    onNavigatePage(
      getCoursePlayerPath(getCourseRouteKey(course), lessonNumber),
    );
  };
  const locationHash =
    typeof window === "undefined" ? "" : window.location.hash;

  useLayoutEffect(() => {
    if (!locationHash) return undefined;

    let targetId: string;
    try {
      targetId = decodeURIComponent(locationHash.slice(1));
    } catch {
      return undefined;
    }
    if (!targetId) return undefined;

    const revealTarget = () => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    };
    revealTarget();
    const frame = window.requestAnimationFrame(revealTarget);
    return () => window.cancelAnimationFrame(frame);
  }, [courseSlug, locationHash]);

  const title =
    adaptedFromPreview?.course.title ?? customCourse?.title ?? course.title;
  const thumbnail =
    adaptedFromPreview?.course.thumbnail ??
    customCourse?.thumbnail ??
    course.thumbnail;
  const shortDescription =
    adaptedFromPreview?.shortDescription ?? customShortDescription ?? undefined;
  const courseSections = adaptedFromPreview?.sections ?? customSections ?? [];
  const activeDescription =
    adaptedFromPreview?.description ?? customDescription ?? course.description;
  const activePricing =
    adaptedFromPreview?.pricing ??
    customPricing ??
    (course.pricing ? { price: course.pricing.price } : undefined);
  const isPaidCourse =
    propIsPaidCourse !== undefined
      ? propIsPaidCourse
      : !isFreeCoursePricing(activePricing);

  const inclusions: string[] | undefined = adaptedFromPreview
    ? adaptedFromPreview.inclusions
    : customInclusions !== undefined
      ? Array.from(
          new Set(customInclusions.map((s) => s.trim()).filter(Boolean)),
        )
      : customIncludes !== undefined
        ? Array.from(
            new Set(
              customIncludes
                .map((inc) => inc.label.trim())
                .filter(
                  (label) =>
                    !/^\d+\s+(sections|lectures)/i.test(label) &&
                    !/on-demand content/i.test(label),
                ),
            ),
          )
        : undefined;

  const [openSections, setOpenSections] = useState<Set<number>>(
    () => new Set([0]),
  );
  const wishlistTarget = useMemo(
    (): Pick<Course, "id" | "slug"> => ({
      id: course?.id ?? courseSlug ?? "",
      slug: course?.slug ?? courseSlug,
    }),
    [course?.id, course?.slug, courseSlug],
  );
  const wishlisted = useCourseWishlisted(wishlistTarget);
  const toggleWishlistCourse = useToggleWishlistCourse();

  // As in the course content beside a lesson: any number of sections may be
  // open, and opening or closing one moves nothing. The section opens where
  // it is, downwards. (It used to close the others and then scroll to the
  // one opened, which took the page up as they shut and back down again.)
  const toggleSection = (index: number) => {
    setOpenSections((open) => {
      const next = new Set(open);
      if (!next.delete(index)) next.add(index);
      return next;
    });
  };

  const expandAllSections = () => {
    setOpenSections(new Set(courseSections.map((_, index) => index)));
  };

  const collapseAllSections = () => {
    setOpenSections(new Set());
  };

  const toggleWishlist = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (isReadOnlyPreview || !wishlistTarget.id) return;
      toggleWishlistCourse(wishlistTarget);
    },
    [isReadOnlyPreview, toggleWishlistCourse, wishlistTarget],
  );

  const trailerMediaId =
    adaptedFromPreview?.trailerMediaId ??
    customTrailerMediaId ??
    (course as { trailerMediaId?: string | null }).trailerMediaId ??
    null;

  // Someone who manages the course has nothing to save for later or to try
  // before buying, and neither has a learner who is already enrolled.
  const managesCourse = isCreator && !isReadOnlyPreview;
  const isEnrolled = Boolean(user && course.enrolled);
  // What a visitor can watch before buying: the lessons a paid course marks
  // as free previews (the ones the curriculum labels "Free").
  const firstFreeLessonNumber = isPaidCourse
    ? courseSections
        .flatMap((section) => section.lessons)
        .find((lesson) => lesson[4])?.[0]
    : undefined;
  const canPreview =
    Boolean(trailerMediaId) ||
    (!managesCourse && !isEnrolled && firstFreeLessonNumber !== undefined);
  const openPreview = () => {
    if (isReadOnlyPreview || !onNavigatePage) return;
    const courseKey = getCourseRouteKey(course);
    onNavigatePage(
      trailerMediaId || firstFreeLessonNumber === undefined
        ? `/learn/${encodeURIComponent(courseKey)}`
        : getCoursePlayerPath(courseKey, firstFreeLessonNumber),
    );
  };

  // On the course page the hero touches the frame; in the course editor's
  // preview window it is a card in the column with the rest.
  const hero = (
    <CourseOverviewHero
      placement={isReadOnlyPreview ? "card" : "edge"}
      title={title}
      shortDescription={shortDescription}
      sections={course.sections}
      lessons={course.lectures}
      duration={course.duration}
      thumbnail={thumbnail}
      thumbnailSrcSet={course.thumbnailSrcSet}
      onBack={onNavigateCourses}
      // The link names the page it returns to. The course list is "All
      // courses" from here, where one course is open; any other page keeps
      // the name the menu gives it. In the editor's preview it closes the
      // preview.
      backLabel={
        isReadOnlyPreview
          ? "Back to editor"
          : !backSection || backSection === "Courses"
            ? "All courses"
            : backSection
      }
      wishlist={
        managesCourse
          ? undefined
          : {
              wishlisted,
              disabled: isReadOnlyPreview,
              onToggle: toggleWishlist,
            }
      }
      preview={
        canPreview
          ? { onOpen: openPreview, disabled: isReadOnlyPreview }
          : undefined
      }
    />
  );

  return (
    <div
      data-course-overview
      className={`flex w-full flex-col gap-4 text-(--text) ${
        isReadOnlyPreview
          ? "p-[36px_24px_48px] max-[900px]:p-[24px_16px_48px] max-[640px]:p-[16px_14px_40px]"
          : ""
      }`}
    >
      {/* 1. Title and course facts over the thumbnail */}
      {isReadOnlyPreview ? null : hero}

      <div className={overviewColumnClasses} data-fixed-radius>
        {isReadOnlyPreview ? hero : null}

        {/* 2. For an enrolled learner, where they are in the course;
            otherwise the price, the coupon and the button that buys it. */}
        {isEnrolled && !managesCourse ? (
          <CourseLearnerProgressBar
            courseKey={getCourseRouteKey(course)}
            courseTitle={title}
            progress={course.progress ?? 0}
            totalLessons={course.lectures}
            onNavigatePage={onNavigatePage}
          />
        ) : (
          <CoursePurchaseSection
            course={course}
            pricing={activePricing}
            inclusions={inclusions}
            onNavigatePage={onNavigatePage}
            isReadOnlyPreview={isReadOnlyPreview}
            isCreator={isCreator}
            canSelfEnroll={adaptedFromPreview?.canSelfEnroll}
          />
        )}

        {/* 3. About This Course */}
        <CourseAboutCard description={activeDescription} />

        {/* 4. Course Curriculum */}
        <CourseOverviewCurriculum
          sectionCount={course.sections}
          lessonCount={course.lectures}
          courseSections={courseSections}
          openSections={openSections}
          onToggleSection={toggleSection}
          onExpandAll={expandAllSections}
          onCollapseAll={collapseAllSections}
          onSelectLesson={handleSelectLesson}
          isReadOnlyPreview={isReadOnlyPreview}
          isPaidCourse={isPaidCourse}
        />
      </div>
    </div>
  );
}
