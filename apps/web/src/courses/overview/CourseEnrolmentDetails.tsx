import type { ReactNode } from "react";
import { CalendarCheck } from "@phosphor-icons/react/CalendarCheck";
import { Clock } from "@phosphor-icons/react/Clock";
import { Infinity as InfinityIcon } from "@phosphor-icons/react/Infinity";
import { TrendUp } from "@phosphor-icons/react/TrendUp";
import { Warning } from "@phosphor-icons/react/Warning";
import type { CourseAccessEnrollment } from "@veolms/contracts";
import { formatMoney } from "@veolms/contracts/commerce/money";
import { formatTimeAgo } from "../../lib/timeAgo";
import { ordersService } from "../../services/orders";
import {
  describeEnrolmentAccess,
  describePace,
  formatEnrolmentDate,
  paymentMethodLabel,
  type EnrolmentAccessTone,
} from "./enrolmentDetails";

interface CourseEnrolmentDetailsProps {
  enrollment: CourseAccessEnrollment;
  /** When the learner's access ends; null when it does not. */
  accessExpiresAt: string | null;
}

const toneClasses: Record<
  EnrolmentAccessTone,
  { tile: string; remaining: string }
> = {
  lifetime: {
    tile: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    remaining: "text-emerald-600 dark:text-emerald-400",
  },
  active: {
    tile: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    remaining: "text-emerald-600 dark:text-emerald-400",
  },
  ending: {
    tile: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    remaining: "text-amber-600 dark:text-amber-400",
  },
  ended: {
    tile: "bg-red-500/12 text-red-600 dark:text-red-400",
    remaining: "text-red-600 dark:text-red-400",
  },
};

function DetailRow({
  icon,
  tileClassName,
  label,
  children,
  note,
}: {
  icon: ReactNode;
  tileClassName: string;
  label: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <li className="flex min-w-0 gap-3">
      <span
        aria-hidden="true"
        className={`grid size-9 shrink-0 place-items-center rounded-lg ${tileClassName}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[0.78rem] text-(--muted)">{label}</p>
        <p className="font-semibold text-(--text)">{children}</p>
        {note ? (
          <p className="mt-0.5 text-[0.78rem] text-(--muted)">{note}</p>
        ) : null}
      </div>
    </li>
  );
}

/**
 * The learner's enrolment under their progress: when they enrolled and the
 * order it came with, how long their access lasts, and their pace.
 */
export function CourseEnrolmentDetails({
  enrollment,
  accessExpiresAt,
}: CourseEnrolmentDetailsProps) {
  const access = describeEnrolmentAccess(accessExpiresAt);
  const pace = describePace(enrollment.pace, accessExpiresAt);
  const order = enrollment.order;
  const method = paymentMethodLabel(order?.paymentMethod ?? null);
  const tone = toneClasses[access.tone];
  const neutralTile =
    "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-(--accent)";

  const orderNote = order ? (
    <>
      Order #{order.orderNumber.replace(/^#/u, "")}
      {order.totalAmount > 0 ? (
        <>
          {" · "}
          {formatMoney(order.totalAmount, { currency: order.currency })}
          {method ? ` via ${method}` : null}
        </>
      ) : null}
      {order.hasInvoice ? (
        <>
          {" · "}
          <a
            href={ordersService.getInvoiceDownloadUrl(order.id, "student")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-(--accent) underline underline-offset-2"
          >
            Invoice
          </a>
        </>
      ) : null}
    </>
  ) : (
    "Given free of charge"
  );

  return (
    <div className="flex flex-col gap-4 border-t border-[color-mix(in_srgb,var(--text)_9%,transparent)] pt-5">
      <h3 className="font-bold text-(--text)">Your enrollment</h3>
      <ul className="grid gap-4 text-[0.9rem] @2xl/price:grid-cols-3 @2xl/price:gap-6">
        <DetailRow
          icon={<CalendarCheck size={18} />}
          tileClassName={neutralTile}
          label="Enrolled on"
          note={orderNote}
        >
          {formatEnrolmentDate(enrollment.enrolledAt)}{" "}
          <span className="font-normal text-(--muted)">
            ({formatTimeAgo(enrollment.enrolledAt)})
          </span>
        </DetailRow>

        {access.tone === "ending" ? (
          <li className="flex min-w-0 gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
            <span
              aria-hidden="true"
              className={`grid size-9 shrink-0 place-items-center rounded-lg ${tone.tile}`}
            >
              <Warning size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[0.78rem] font-semibold text-amber-600 dark:text-amber-400">
                Access ends soon
              </p>
              <p className="font-semibold text-(--text)">
                {access.value}{" "}
                <span className={tone.remaining}>({access.remaining})</span>
              </p>
            </div>
          </li>
        ) : (
          <DetailRow
            icon={
              access.tone === "lifetime" ? (
                <InfinityIcon size={18} />
              ) : (
                <Clock size={18} />
              )
            }
            tileClassName={tone.tile}
            label={access.tone === "lifetime" ? "Access" : "Access until"}
            note={
              access.tone === "lifetime"
                ? "No end date · learn at whatever pace suits you"
                : undefined
            }
          >
            {access.value}{" "}
            <span className={`font-normal ${tone.remaining}`}>
              ({access.remaining})
            </span>
          </DetailRow>
        )}

        <DetailRow
          icon={<TrendUp size={18} />}
          tileClassName="bg-violet-500/12 text-violet-600 dark:text-violet-400"
          label="Your pace"
          note={pace.note}
        >
          {pace.value}
        </DetailRow>
      </ul>
    </div>
  );
}
