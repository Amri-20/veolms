import { z } from "zod";

export const dailyQuoteResponseSchema = z
  .object({
    id: z.number().int().positive(),
    text: z.string().min(1),
    author: z.string().min(1),
  })
  .describe(
    "The quote of the day: the same one for every visitor until the next day (UTC).",
  );

export type DailyQuoteResponse = z.output<typeof dailyQuoteResponseSchema>;
