import {
  Fragment,
  type RefObject,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { SidebarResizeReadout } from "./SidebarResizeReadout";
import { getNavigationIconColor, type NavigationItem } from "./navigation";
import type { NavigationItemWithMetadata } from "./navigation";
import type { SidebarPreferences } from "../settings/settingsPreferences";
import { SIDEBAR_NAV_ITEM_SQUIRCLE_CLASS } from "./academyShellClasses";
import type { SidebarTooltip } from "./academyShellTypes";
import { ShortcutKeys } from "./ShortcutKeys";

export interface SidebarNavigationProps {
  navigationScrollFade: { top: boolean; bottom: boolean; overflow: boolean };
  navigationRef: RefObject<HTMLElement | null>;
  setSidebarTooltip: Dispatch<SetStateAction<SidebarTooltip | null>>;
  updateNavigationScrollFade: () => void;
  navigation: NavigationItem[];
  isNavigationItemActive: (item: NavigationItemWithMetadata) => boolean;
  sidebarPreferences: SidebarPreferences;
  primaryShortcutModifier: "Meta" | "Control";
  selectNavigation: (label: string, item?: NavigationItemWithMetadata) => void;
  navigationUsesCompactInteraction: boolean;
  showSidebarTooltip: (
    event:
      ReactMouseEvent<HTMLButtonElement> | ReactFocusEvent<HTMLButtonElement>,
    label: string,
    active: boolean,
    showWhenExpanded?: boolean,
    preferenceControlled?: boolean,
  ) => void;
  hideCollapsedNavigationTooltip: (
    event:
      ReactMouseEvent<HTMLButtonElement> | ReactFocusEvent<HTMLButtonElement>,
  ) => void;
  showKeyboardShortcuts: boolean;
  settingsShortcutKeys: string[];
  sidebarResizing: boolean;
  sidebarResizePreviewWidth: number | null;
  renderedSidebarWidth: number;
}

export function SidebarNavigation({
  navigationScrollFade,
  navigationRef,
  setSidebarTooltip,
  updateNavigationScrollFade,
  navigation,
  isNavigationItemActive,
  sidebarPreferences,
  primaryShortcutModifier,
  selectNavigation,
  navigationUsesCompactInteraction,
  showSidebarTooltip,
  hideCollapsedNavigationTooltip,
  showKeyboardShortcuts,
  settingsShortcutKeys,
  sidebarResizing,
  sidebarResizePreviewWidth,
  renderedSidebarWidth,
}: SidebarNavigationProps) {
  // prettier-ignore
  return (
    <nav
      id="courses-sidebar-nav-scrollport"
      className={[
        // A size container, so menu items can tell when the rail
        // has finished narrowing. The side padding lines the menu
        // items up with the profile button's left and right edges.
        // The top padding is 6px more than the stylesheet's in both
        // states, which keeps the first item on the same row in each.
        // It is padding rather than margin because the list clips at
        // its own edge: the room has to be inside it, or the first
        // item's shadow is cut off at the top.
        "courses-nav @container gap-2! px-[9.5px]! pt-[11px]! [.courses-app--collapsed_&]:pt-[22px]!",
        // The list scrolls, and a browser decides how a finger may pan
        // from the scroll area itself, not from the sidebar around
        // it. Without this it claims sideways swipes on the menu
        // (and sends none to the page), so the swipe that resizes
        // the sidebar never began here on a real touch screen.
        "touch-pan-y touch-pinch-zoom",
        navigationScrollFade.top ? "has-scroll-top" : "",
        navigationScrollFade.bottom ? "has-scroll-bottom" : "",
        navigationScrollFade.overflow ? "has-overflow" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      ref={navigationRef}
      onScroll={() => {
        setSidebarTooltip(null);
        updateNavigationScrollFade();
      }}
    >
      {navigation.map((item, navigationIndex) => {
        const [label, Icon] = item;
        const active = isNavigationItemActive(item);
        const navigationShortcutIndex = navigationIndex + 1;
        const displayLabel = label;
        const accessibleLabel = displayLabel;
        return (
          <Fragment key={label}>
            <button
              type="button"
              className={`${active ? "is-active " : ""}${SIDEBAR_NAV_ITEM_SQUIRCLE_CLASS}`}
              style={
                {
                  "--nav-icon-color": getNavigationIconColor(
                    label,
                    sidebarPreferences,
                  ),
                } as CSSProperties
              }
              aria-label={accessibleLabel}
              aria-current={active ? "page" : undefined}
              aria-keyshortcuts={
                label === "Settings"
                  ? `${navigationIndex + 1} ${primaryShortcutModifier}+Comma`
                  : String(navigationIndex + 1)
              }
              onClick={() => selectNavigation(label, item)}
              onContextMenu={(event) => {
                if (navigationUsesCompactInteraction)
                  event.preventDefault();
              }}
              onMouseEnter={(event) =>
                showSidebarTooltip(event, displayLabel, active)
              }
              onMouseLeave={hideCollapsedNavigationTooltip}
              onFocus={(event) =>
                showSidebarTooltip(event, displayLabel, active)
              }
              onBlur={hideCollapsedNavigationTooltip}
            >
              <Icon size={26} weight={active ? "fill" : "regular"} />
              <span className="courses-nav__text">{displayLabel}</span>
              {showKeyboardShortcuts && (
                <ShortcutKeys
                  className="courses-nav__shortcut"
                  keys={
                    label === "Settings"
                      ? settingsShortcutKeys
                      : [String(navigationShortcutIndex)]
                  }
                />
              )}
            </button>
          </Fragment>
        );
      })}
      {/* Blank room the height of two menu items, shown only when
                  the list scrolls, so the last items can be brought up
                  clear of the profile button (see navigation.css). */}
      <div
        className="courses-nav__end-space"
        data-nav-end-space=""
        aria-hidden="true"
      />
      {sidebarResizing &&
      sidebarPreferences.showResizeDimensions === true ? (
        <SidebarResizeReadout
          sidebarWidth={
            sidebarResizePreviewWidth ?? renderedSidebarWidth
          }
        />
      ) : null}
    </nav>
  );
}
