import { useEffect, useRef, useState, type RefObject } from "react";
import { isEditingShortcutTarget } from "../../keyboardShortcuts";
import { playEnterKeySound } from "./enterKeySound";

/** What has a use of its own for Enter while the focus is on it. */
const OWN_ENTER_SELECTOR =
  "a[href], button, summary, [role='button'], [role='link'], [role='menuitem'], [role='option'], [role='tab'], [role='switch'], [role='checkbox'], [role='radio']";

/**
 * Whether the element can be seen and pressed right now: in the window, and
 * with nothing lying over its middle (a dialog, a menu, a drawer).
 */
function isOnTop(element: Element) {
  const box = element.getBoundingClientRect();
  const top = document.elementFromPoint(
    box.left + box.width / 2,
    box.top + box.height / 2,
  );
  return Boolean(top) && element.contains(top);
}

/**
 * Lets the Enter key press an action drawn as an Enter key: the action goes
 * down with the key and is carried out when the key comes back up, as a key
 * on a keyboard is, and it sounds like one both ways. Returns whether it is
 * down.
 *
 * The key is left alone wherever Enter already means something: while
 * typing, on a link or a button that has the focus (on the action itself
 * the browser does the pressing, and only the sound is added), with a
 * modifier held, and while it repeats, as it does when held from the page
 * before. It is also left alone while the action is scrolled out of the
 * window or covered.
 */
export function useEnterKeyAction(
  actionRef: RefObject<HTMLElement | null>,
  onPress: () => void,
) {
  const [pressed, setPressed] = useState(false);
  const armedRef = useRef(false);
  const onPressRef = useRef(onPress);
  useEffect(() => {
    onPressRef.current = onPress;
  });

  useEffect(() => {
    const release = () => {
      armedRef.current = false;
      setPressed(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== "Enter" ||
        event.repeat ||
        event.isComposing ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }
      const action = actionRef.current;
      if (!action) return;
      if (event.target instanceof Node && action.contains(event.target)) {
        playEnterKeySound("down");
        return;
      }
      if (
        isEditingShortcutTarget(event.target) ||
        (event.target instanceof Element &&
          event.target.closest(OWN_ENTER_SELECTOR)) ||
        !isOnTop(action)
      ) {
        return;
      }
      armedRef.current = true;
      setPressed(true);
      playEnterKeySound("down");
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || !armedRef.current) return;
      release();
      playEnterKeySound("up");
      onPressRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", release);
    };
  }, [actionRef]);

  return pressed;
}
