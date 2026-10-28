import { createContext, useContext, type ReactNode } from "react";
import { findSearchMatches } from "./fuzzySearch";

/**
 * The search a list of results was found with, so the words it found are
 * highlighted in them (titles, previews and posts alike). Empty: nothing
 * is highlighted.
 */
const SearchHighlightContext = createContext("");

export const SearchHighlightProvider = SearchHighlightContext.Provider;

export function useSearchHighlight(): string {
  return useContext(SearchHighlightContext);
}

/**
 * A found word: the theme's accent, see-through, behind the text, so it
 * suits whichever theme is on.
 */
export const SEARCH_MATCH_CLASS =
  "rounded-[0.2em] bg-[color-mix(in_srgb,var(--accent)_38%,transparent)] box-decoration-clone px-0.5 text-inherit";

/** `text` with the words the current search found highlighted. */
export function HighlightedText({ text }: { text: string }): ReactNode {
  const query = useSearchHighlight();
  const ranges = query.trim() ? findSearchMatches(query, text) : [];
  if (ranges.length === 0) return text;

  const pieces: ReactNode[] = [];
  let index = 0;
  for (const [start, end] of ranges) {
    if (start > index) pieces.push(text.slice(index, start));
    pieces.push(
      <mark key={start} className={SEARCH_MATCH_CLASS} data-search-match="">
        {text.slice(start, end)}
      </mark>,
    );
    index = end;
  }
  if (index < text.length) pieces.push(text.slice(index));
  return pieces;
}
