import { CaretDownIcon as CaretDown } from "@phosphor-icons/react/CaretDown";
import { CaretRightIcon as CaretRight } from "@phosphor-icons/react/CaretRight";
import { GuestProfileIcon } from "../icons/GuestProfileIcon";
import { ShellProfileAvatar } from "./ShellProfileAvatar";
import type { AuthIdentityHint } from "../store/auth.store";

export function LoginProfileButton({
  className,
  arrowSize,
  onLogin,
  remembered,
}: {
  className: string;
  arrowSize: number;
  onLogin: () => void;
  /**
   * The profile remembered from the previous page load, shown while the
   * session is still being checked so the button already looks like the
   * signed-in one.
   */
  remembered?: AuthIdentityHint | null;
}) {
  const displayName = remembered?.displayName;
  const handle = remembered?.username
    ? remembered.username.startsWith("@")
      ? remembered.username
      : `@${remembered.username}`
    : null;
  return (
    <button
      type="button"
      className={`${className} courses-profile__login-button`}
      aria-label={
        displayName
          ? `Account for ${displayName}. Open account access`
          : "Login. Sign in for more"
      }
      data-auth-identity-button=""
      onClick={onLogin}
    >
      {/* The box is as large as the profile picture's frame, so the name
          beside it does not move when the picture replaces the icon. The
          icon is drawn a little larger than its default, its circle about
          midway between that default and the picture's size. */}
      {remembered?.avatarUrl ? (
        <span className="courses-profile__avatar-wrap">
          <ShellProfileAvatar avatarUrl={remembered.avatarUrl} />
        </span>
      ) : (
        <i
          aria-hidden="true"
          className="courses-profile__login-icon flex size-13.5 shrink-0 items-center justify-center text-(--accent) [.mobile-menu-sheet\_\_profile_&]:size-13 [&>svg]:size-[52px] [&>svg]:shrink-0"
        >
          <GuestProfileIcon size={45.36} />
        </i>
      )}
      <span className="courses-profile__login-copy">
        <strong
          className="courses-profile__login-title"
          data-auth-identity-title=""
        >
          {displayName || "Login"}
        </strong>
        <small
          className="courses-profile__login-subtitle"
          data-auth-identity-subtitle=""
        >
          {displayName ? (handle ?? "Account") : "Sign in for more"}
        </small>
      </span>
      {remembered ? (
        <CaretDown
          size={19}
          aria-hidden="true"
          className="courses-profile__caret"
        />
      ) : (
        <i
          aria-hidden="true"
          className="courses-profile__login-arrow ml-auto flex shrink-0 items-center justify-center text-(--accent)"
        >
          <CaretRight size={arrowSize} weight="bold" />
        </i>
      )}
    </button>
  );
}
