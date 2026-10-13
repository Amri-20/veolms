/**
 * The category a basics update asks for, read from its two spellings
 * (`categoryId`, and the older alias `category`):
 *
 * - a category id: the course is given that category;
 * - `null`: the course's category is removed;
 * - `undefined`: neither field was sent, so the category is left as it is.
 *
 * A category named in either field wins over a `null` in the other. This one
 * value is what the update checks, writes and reports back.
 *
 * It used to be `categoryId ?? category` at each of those three places. For
 * `{ categoryId: null }` that is `undefined`, which the write skips: the
 * request answered 200 with `categoryId: null` and the stored category
 * stayed, so a course's category could not be removed.
 */
export function resolveBasicsCategoryUpdate(updates: {
  categoryId?: string | null;
  category?: string | null;
}): string | null | undefined {
  const named = updates.categoryId ?? updates.category;
  if (named !== null && named !== undefined) return named;
  return updates.categoryId === undefined && updates.category === undefined
    ? undefined
    : null;
}
