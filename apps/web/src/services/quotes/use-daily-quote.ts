import { useQuery } from "@tanstack/react-query";
import type { DailyQuoteResponse } from "@veolms/contracts";
import type { ApiError } from "../../lib/api-error";
import { quotesService } from "./quotes.service";

export const quotesKeys = {
  all: ["quotes"] as const,
  daily: () => [...quotesKeys.all, "daily"] as const,
};

/**
 * The quote of the day. It is asked for in the browser, never while a page
 * is prerendered, so a built page does not carry the quote of its build day.
 * It changes once a day, so it is not asked for again within the hour.
 */
export function useDailyQuote() {
  return useQuery<DailyQuoteResponse, ApiError>({
    queryKey: quotesKeys.daily(),
    queryFn: () => quotesService.getDaily(),
    enabled: typeof window !== "undefined",
    retry: false,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
