import { useEffect } from "react";

/**
 * Focuses a page's own search box on "/" or Ctrl/Cmd+K, unless something is
 * being typed into. The shell's shortcut (`useGlobalSearchShortcut`) takes
 * Ctrl+K or Cmd+K first, whichever the platform uses; this adds "/" and the
 * other modifier on the pages that had their own copy of it.
 */
export function usePageSearchShortcut(searchInputId: string) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      const isInput =
        activeTag === "input" ||
        activeTag === "textarea" ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (
        !isInput &&
        (event.key === "/" ||
          ((event.metaKey || event.ctrlKey) && event.key === "k"))
      ) {
        event.preventDefault();
        document.getElementById(searchInputId)?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchInputId]);
}
