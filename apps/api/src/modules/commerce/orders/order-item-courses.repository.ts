import type { Executor } from "../shared/repository.types.ts";

export interface OrderItemCourseRecord {
  order_item_id: string;
  order_id: string;
  user_id: string;
  course_id: string;
  granted_at: Date;
}

/**
 * Notes which courses an order's items granted. Rows are only ever added:
 * fulfilment can run again for the same order, and an item's course that is
 * already noted is left exactly as it was first written.
 */
export async function recordOrderItemCourses(
  database: Executor,
  records: OrderItemCourseRecord[],
): Promise<void> {
  if (records.length === 0) return;
  await database
    .insertInto("order_item_courses")
    .values(records)
    .onConflict((conflict) =>
      conflict.columns(["order_item_id", "course_id"]).doNothing(),
    )
    .execute();
}
