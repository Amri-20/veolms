import { CaretDownIcon as CaretDown } from "@phosphor-icons/react/CaretDown";
import { useState, type ReactNode } from "react";
import { LoadingSpinnerIcon } from "../components/LoadingSpinner";
import { cn } from "../lib/utils";
import type { LastGoogleAccount } from "./lastGoogleAccount";
import { GoogleBrandIcon } from "./SocialBrandIcons";

/**
 * The Google sign-in button, in the login card's own shape and colours and
 * within Google's sign-in branding guidelines:
 *
 * - Google's standard "G", unaltered, at 20px (the guidelines allow no other
 *   logo, colour or size), with 12px before it and 10px after it.
 * - Google Sans Medium, the guidelines' button font (loaded below).
 * - "Continue with Google", one of the guidelines' wordings; the account
 *   version says "Continue as <name>", as Google's own personalised button
 *   does.
 * - A dark fill in the dark themes and a light one in the light theme, the
 *   two backgrounds the "G" may stand on, here the card's own surface a
 *   shade deeper, with a 1px edge. The guidelines give Google's own fills
 *   as defaults and set no rule for the corner or the height (the button
 *   may be scaled, the logo kept unstretched), so the login card's own are
 *   used: 46px tall with 10px corners, like its email field and button
 *   (see LoginCardParts).
 */

// Google Sans comes from Google Fonts, asked for when the login card's code
// loads (this module), so it is usually in by the time the card is drawn.
// Until then the app's font stands in.
const GOOGLE_SANS_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500&display=swap";

function loadGoogleSans() {
  if (typeof document === "undefined") return;
  if (document.querySelector("link[data-google-sans]")) return;
  const preconnect = document.createElement("link");
  preconnect.rel = "preconnect";
  preconnect.href = "https://fonts.gstatic.com";
  preconnect.crossOrigin = "anonymous";
  document.head.appendChild(preconnect);
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = GOOGLE_SANS_STYLESHEET;
  stylesheet.dataset.googleSans = "";
  document.head.appendChild(stylesheet);
}
loadGoogleSans();

/**
 * The surface both versions share. Important on the font: the login card's
 * stylesheet sets `font: inherit` on buttons, which outranks utilities.
 */
const googleSurfaceClasses = [
  "relative w-full min-h-11.5 rounded-[10px] border",
  "border-[color-mix(in_srgb,var(--text)_24%,transparent)] bg-[color-mix(in_srgb,var(--canvas)_30%,var(--surface))] text-(--text)",
  "[font-family:'Google_Sans',var(--app-font-family,sans-serif)]! text-[0.9375rem]! leading-5! font-medium! tracking-[0.1px]!",
].join(" ");

/** Hover and press: the text's colour laid over the fill, as Google does. */
const pressableClasses =
  "cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--text)_7%,transparent)] active:bg-[color-mix(in_srgb,var(--text)_11%,transparent)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--accent) disabled:cursor-progress disabled:hover:bg-transparent";

export function GoogleSignInButton({
  busyLabel,
  describedBy,
  disabled,
  onClick,
}: {
  /** Shown in place of the wording while a sign-in is under way. */
  busyLabel: string | null;
  /** The id of the message under the button, when one is shown. */
  describedBy?: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-busy={busyLabel !== null}
      aria-describedby={describedBy}
      aria-label={busyLabel ? "Verifying Google sign-in" : undefined}
      className={cn(
        googleSurfaceClasses,
        pressableClasses,
        "flex items-center justify-center gap-2.5 px-3 whitespace-nowrap",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <GoogleBrandIcon size={20} />
      {busyLabel ? (
        <>
          <LoadingSpinnerIcon size={18} className="text-current!" />
          {busyLabel}
        </>
      ) : (
        "Continue with Google"
      )}
    </button>
  );
}

function AccountPicture({ account }: { account: LastGoogleAccount }) {
  const [failed, setFailed] = useState(false);
  const initial = (account.name || account.email).charAt(0).toUpperCase();
  return account.avatarUrl && !failed ? (
    <img
      alt=""
      className="size-9 shrink-0 rounded-full object-cover"
      decoding="async"
      draggable={false}
      height={36}
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
      src={account.avatarUrl}
      width={36}
    />
  ) : (
    <span
      aria-hidden="true"
      className="grid size-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--accent)_24%,var(--surface))] text-sm font-semibold text-(--accent-ink,var(--accent))"
    >
      {initial}
    </span>
  );
}

/**
 * The button for the Google account this browser last signed in with: its
 * picture, "Continue as <first name>" over the address, and Google's "G".
 * The arrow beside it opens Google's own account chooser for any other
 * account. "Last used" marks it when Google was how this browser last
 * signed in.
 */
export function GoogleAccountButton({
  account,
  lastUsed,
  busyLabel,
  describedBy,
  disabled,
  onContinue,
  onChooseAccount,
}: {
  account: LastGoogleAccount;
  lastUsed: boolean;
  busyLabel: string | null;
  describedBy?: string;
  disabled: boolean;
  onContinue: () => void;
  onChooseAccount: () => void;
}) {
  const firstName = account.name.split(/\s+/)[0] || account.name;
  const secondLine: ReactNode = busyLabel ? (
    <span className="flex items-center gap-1.5">
      <LoadingSpinnerIcon size={13} className="text-current!" />
      {busyLabel}
    </span>
  ) : (
    account.email
  );
  return (
    // With the tag, a little more room above the button, so the tag clears
    // the "OR" line over it.
    <div
      className={cn(
        googleSurfaceClasses,
        // Two lines, so taller than the one-line buttons: room for the
        // "Last used" tag to sit centred on the top edge, clear of the name.
        "flex min-h-14.5 items-stretch",
      )}
    >
      {lastUsed ? (
        // Centred on the button's top edge, half above it and half below;
        // the ring in the card's colour cuts the edge around it. A deeper
        // shade of the accent, so white reads clearly on it in every theme.
        <span className="pointer-events-none absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color-mix(in_srgb,var(--accent)_78%,black)] px-2.5 py-0.5 [font-family:var(--app-font-family,sans-serif)] text-[0.6875rem] leading-3 font-bold tracking-[0.06em] whitespace-nowrap text-white uppercase shadow-[0_1px_6px_color-mix(in_srgb,var(--accent)_45%,transparent)] ring-2 ring-(--surface)">
          Last used
        </span>
      ) : null}
      <button
        aria-busy={busyLabel !== null}
        aria-describedby={describedBy}
        aria-label={`Continue as ${account.name} (${account.email}) with Google`}
        className={cn(
          pressableClasses,
          "flex min-w-0 flex-1 items-center gap-3 rounded-l-[9px] py-2.5 pr-3 pl-3 text-left",
        )}
        disabled={disabled}
        onClick={onContinue}
        type="button"
      >
        <AccountPicture account={account} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate leading-4.5!">Continue as {firstName}</span>
          <span className="truncate text-xs leading-4 font-normal text-(--muted)">
            {secondLine}
          </span>
        </span>
        <GoogleBrandIcon size={20} />
      </button>
      <span
        aria-hidden="true"
        className="my-2.5 w-px shrink-0 bg-[color-mix(in_srgb,var(--text)_18%,transparent)]"
      />
      <button
        aria-label="Use another Google account"
        title="Use another Google account"
        className={cn(
          pressableClasses,
          "grid w-11 shrink-0 place-items-center rounded-r-[9px] text-(--muted) hover:text-(--text)",
        )}
        disabled={disabled}
        onClick={onChooseAccount}
        type="button"
      >
        <CaretDown size={16} weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
}
