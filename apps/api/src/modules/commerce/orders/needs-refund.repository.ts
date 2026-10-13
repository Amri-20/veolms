import { sql } from "kysely";
import type { Executor } from "../shared/repository.types.ts";
import { SURPLUS_CAPTURE_ERROR_CODE } from "../payments/surplus-payment.ts";

/**
 * Where a page of the list ends: the last entry's time (Postgres text, so
 * its microseconds survive) and id. The next page is everything before it.
 */
export interface NeedsRefundCursor {
  paidAt: string;
  id: string;
}

interface NeedsRefundPage {
  cursor?: NeedsRefundCursor;
  limit: number;
}

/** A `timestamptz` column as text, exact to the microsecond. */
const cursorText = (column: string) =>
  sql<string>`to_char(${sql.ref(column)} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

/**
 * Who the listed buyers are. Just the columns the list shows: the avatar
 * the orders table loads is left out, it is not shown here.
 */
export async function listBuyersByIds(database: Executor, userIds: string[]) {
  if (userIds.length === 0) return [];
  return await database
    .selectFrom("users")
    .select(["id", "display_name", "username", "email"])
    .where("id", "in", userIds)
    .execute();
}

export interface SurplusPaymentToReturnRow {
  id: string;
  order_id: string;
  order_number: string;
  user_id: string;
  /** Minor units, like every payment amount. */
  amount: number;
  currency: string;
  gateway_provider: string;
  gateway_payment_id: string | null;
  error_description: string | null;
  item_titles: string | null;
  paid_at: Date;
  paid_at_cursor: string;
}

/**
 * Surplus payments still to be returned (see payments/surplus-payment.ts),
 * newest first. `paid_at` is when the capture was recorded: the captured
 * attempt's time, because the payment row's own `updated_at` moves again
 * each time a part refund is noted on it.
 */
export async function listSurplusPaymentsToReturn(
  database: Executor,
  { cursor, limit }: NeedsRefundPage,
): Promise<SurplusPaymentToReturnRow[]> {
  const result = await sql<SurplusPaymentToReturnRow>`
    select s.*, ${cursorText("s.paid_at")} as paid_at_cursor
    from (
      select
        p.id,
        p.order_id,
        o.order_number,
        o.user_id,
        p.amount,
        p.currency,
        p.gateway_provider,
        p.gateway_payment_id,
        p.error_description,
        (
          select string_agg(oi.title_snapshot, ', ' order by oi.created_at, oi.id)
          from order_items oi
          where oi.order_id = o.id
        ) as item_titles,
        coalesce(
          (
            select max(pa.created_at)
            from payment_attempts pa
            where pa.payment_id = p.id and pa.status = 'captured'
          ),
          p.updated_at
        ) as paid_at
      from payments p
      join orders o on o.id = p.order_id
      where p.error_code = ${SURPLUS_CAPTURE_ERROR_CODE}
        and p.status = 'captured'
    ) s
    where ${
      cursor
        ? sql`(s.paid_at, s.id) < (${cursor.paidAt}::timestamptz, ${cursor.id}::uuid)`
        : sql`true`
    }
    order by s.paid_at desc, s.id desc
    limit ${limit}
  `.execute(database);
  return result.rows;
}

export interface DuplicatePurchaseRow {
  /** The later order's item for the course. */
  id: string;
  course_id: string;
  title_snapshot: string;
  user_id: string;
  currency: string;
  /** The later-paid order: the one to refund. */
  order_id: string;
  order_number: string;
  /** Major units, as order and item columns are stored. */
  final_amount: number;
  /** Major units. */
  total_amount: number;
  paid_at: Date;
  paid_at_cursor: string;
  earlier_order_id: string;
  earlier_order_number: string;
  /** Major units. */
  earlier_final_amount: number;
  earlier_paid_at: Date;
  /** Minor units, like every refund amount. Text: a Postgres bigint. */
  refunded_amount: string;
  gateway_provider: string | null;
  gateway_payment_id: string | null;
}

/**
 * Duplicate purchases, newest first: a buyer holding two orders, each paid
 * (`paid` or `partially_refunded`), that both contain the same course as a
 * course item. One row per later order; `earlier_*` is the order holding
 * that course that was paid just before it. (A course paid for three times
 * gives two rows: the second order against the first, the third against
 * the second.)
 *
 * What counts, and why:
 *
 *  - Course items only. A course that is also inside a bought bundle is not
 *    a duplicate: checkout allows a bundle while some of its courses are
 *    already owned, and `course_bundle_items` is the bundle as it is today,
 *    not as it was sold.
 *  - An item that has itself been refunded (or has a refund under way) no
 *    longer holds the course, exactly as in order.repository.ts's
 *    findOtherPaidOrderCoveringCourse. A fully refunded order is not
 *    `paid`, so it is out as well.
 *  - The later order must have been created before the earlier one was
 *    paid: both were open at once. That is the only way one course gets
 *    paid for twice by accident. Once an order is paid the buyer holds the
 *    course, and checkout refuses to create or continue another order for
 *    it; an order created after that means the buyer no longer held the
 *    course (access ran out or was taken away) and chose to buy it again,
 *    which is not money to return.
 *  - A later item that cost nothing leaves nothing to return.
 *
 * How it is read: in two steps, on purpose. Comparing every paid order's
 * items with every other's is a join over the whole orders table, so the
 * first step (listOverlappingPaidOrderIds) looks at orders alone and keeps
 * the few that can be the later half of a duplicate. Only those have their
 * items compared here, through the buyer and order indexes. As one
 * statement the planner could not know how few they are, planned the
 * second step for a third of all orders, and spent most of a second
 * preparing a plan it then ran for a handful of rows.
 *
 * All of them are returned, not a page: there are only ever as many as
 * there were double payments, and which of them are still owed is decided
 * from the amounts (needs-refund.mapper.ts's isDuplicateStillOwed), which
 * needs each order's currency.
 *
 * Pass `userId` to look at one buyer only (the check made when an order is
 * paid); that reads the buyer's orders through the (user_id, status) index.
 */
export async function listDuplicatePurchases(
  database: Executor,
  { userId }: { userId?: string } = {},
): Promise<DuplicatePurchaseRow[]> {
  const candidateOrderIds = await listOverlappingPaidOrderIds(database, userId);
  if (candidateOrderIds.length === 0) return [];

  const result = await sql<DuplicatePurchaseRow>`
    with later as (
      select
        oi.id as item_id,
        oi.course_id,
        oi.title_snapshot,
        oi.final_amount,
        o.id as order_id,
        o.order_number,
        o.user_id,
        o.currency,
        o.total_amount,
        coalesce(o.paid_at, o.created_at) as paid_at,
        earlier.order_id as earlier_order_id,
        earlier.order_number as earlier_order_number,
        earlier.final_amount as earlier_final_amount,
        earlier.paid_at as earlier_paid_at
      from orders o
      join order_items oi on oi.order_id = o.id
      join lateral (
        -- The order holding this course that was paid just before.
        select
          e.id as order_id,
          e.order_number,
          ei.final_amount,
          coalesce(e.paid_at, e.created_at) as paid_at
        from orders e
        join order_items ei on ei.order_id = e.id
        where e.user_id = o.user_id
          and e.id <> o.id
          and e.status in ('paid', 'partially_refunded')
          and ei.item_type = 'course'
          and ei.course_id = oi.course_id
          and (coalesce(e.paid_at, e.created_at), e.created_at, e.id)
            < (coalesce(o.paid_at, o.created_at), o.created_at, o.id)
          and not exists (
            select 1
            from refunds r
            where r.order_item_id = ei.id
              and r.status in ('pending', 'processed')
          )
        order by coalesce(e.paid_at, e.created_at) desc, e.created_at desc, e.id desc
        limit 1
      ) earlier on true
      where o.id = any(${candidateOrderIds}::uuid[])
        and o.status in ('paid', 'partially_refunded')
        and oi.item_type = 'course'
        and oi.final_amount > 0
        and o.created_at < earlier.paid_at
        and not exists (
          select 1
          from refunds r
          where r.order_item_id = oi.id
            and r.status in ('pending', 'processed')
        )
    )
    select
      later.item_id as id,
      later.course_id,
      later.title_snapshot,
      later.user_id,
      later.currency,
      later.order_id,
      later.order_number,
      later.final_amount,
      later.total_amount,
      later.paid_at,
      ${cursorText("later.paid_at")} as paid_at_cursor,
      later.earlier_order_id,
      later.earlier_order_number,
      later.earlier_final_amount,
      later.earlier_paid_at,
      (
        select coalesce(sum(r.amount), 0)::bigint
        from refunds r
        where r.order_id = later.order_id and r.status = 'processed'
      ) as refunded_amount,
      pay.gateway_provider,
      pay.gateway_payment_id
    from later
    left join lateral (
      select p.gateway_provider, p.gateway_payment_id
      from payments p
      where p.order_id = later.order_id
        and p.status = 'captured'
        and p.error_code is distinct from ${SURPLUS_CAPTURE_ERROR_CODE}
      order by p.created_at desc, p.id desc
      limit 1
    ) pay on true
    order by later.paid_at desc, later.item_id desc
  `.execute(database);
  return result.rows;
}

/**
 * The paid orders that were still unpaid when the same buyer's previously
 * paid order (for anything) was paid: created before it, paid after it.
 * Every duplicate purchase's later order is one of these, and very few
 * orders are; a buyer's orders normally follow one another. Reads the
 * orders table only.
 */
async function listOverlappingPaidOrderIds(
  database: Executor,
  userId?: string,
): Promise<string[]> {
  const result = await sql<{ id: string }>`
    select paid.id
    from (
      select
        o.id,
        o.created_at,
        lag(coalesce(o.paid_at, o.created_at)) over (
          partition by o.user_id
          order by coalesce(o.paid_at, o.created_at), o.created_at, o.id
        ) as previous_paid_at
      from orders o
      where o.status in ('paid', 'partially_refunded')
        and ${userId ? sql`o.user_id = ${userId}::uuid` : sql`true`}
    ) paid
    where paid.created_at < paid.previous_paid_at
  `.execute(database);
  return result.rows.map((row) => row.id);
}
