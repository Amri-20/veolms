import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router";
import { cancelGoogleOneTap } from "./GoogleOneTap";
import { GitHubBrandIcon, GoogleBrandIcon } from "./SocialBrandIcons";
import {
  OAUTH_PROVIDER_STORAGE_KEY,
  OAUTH_RETURN_TO_STORAGE_KEY,
  clearOauthHandoff,
  clearOauthRedirectResult,
  peekOauthRedirectResult,
  rememberOauthDialogPage,
} from "./oauthFlow";
import { useGoogleSilentSignInCheck } from "./googleSilentSignIn";
import { rememberLoginDialogSnapshot } from "./loginDialogSnapshot";
import {
  askOauthProviderSilently,
  listenForOauthPopup,
  openOauthPopup,
} from "./oauthPopup";
import { resolvePostAuthPath } from "./postAuthNavigation";
import { useOauthLogin, useOauthUrl } from "../services/auth";
import { authStore } from "../store/auth.store";
import { LoadingSpinnerIcon } from "../components/LoadingSpinner";

/**
 * How long a press on the Google button waits for the pop-up's own question
 * to Google (see useGoogleSilentSignInCheck) when it has not been answered
 * yet, before it opens Google's window anyway.
 */
const SILENT_CHECK_WAIT_MS = 1500;

/** GitHub sign-in is hidden for the time being; everything else of it stays. */
const SHOW_GITHUB_SIGN_IN = false;

/**
 * The Google button, drawn to Google's sign-in branding guidelines: the
 * standard four-colour "G" at 20px, Roboto Medium at 14/20px, 12px at the
 * sides and 10px between the logo and the words, 40px tall, a 4px corner.
 * Their dark theme (#131314, a #8E918F edge, #E3E3E3 words) on the app's
 * dark themes and their light one (white, #747775, #1F1F1F) on its light
 * theme. Hovered and pressed it takes their state layer: the words' colour
 * at 8% and 12%. As wide as the login card.
 */
const googleButtonClasses = [
  "inline-flex h-10 w-full shrink-0 cursor-pointer items-center justify-center gap-2.5 rounded-sm border px-3",
  // Important: the login card's stylesheet sets `font: inherit` on buttons,
  // which outranks utility classes.
  "font-['Roboto',Arial,sans-serif]! text-sm! leading-5! font-medium! tracking-[0.25px]! whitespace-nowrap",
  "border-[#8E918F] bg-[#131314] text-[#E3E3E3]",
  "[:root[data-theme=light]_&]:border-[#747775] [:root[data-theme=light]_&]:bg-white [:root[data-theme=light]_&]:text-[#1F1F1F]",
  "transition-colors hover:bg-[color-mix(in_srgb,#E3E3E3_8%,#131314)] active:bg-[color-mix(in_srgb,#E3E3E3_12%,#131314)]",
  "[:root[data-theme=light]_&]:hover:bg-[color-mix(in_srgb,#1F1F1F_8%,white)] [:root[data-theme=light]_&]:active:bg-[color-mix(in_srgb,#1F1F1F_12%,white)]",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)",
  "disabled:cursor-progress",
].join(" ");

interface SocialLoginActionsProps {
  onError?: (message: string) => void;
  oneTapPending?: boolean;
  returnTo?: string | null;
}

export function SocialLoginActions({
  onError,
  oneTapPending = false,
  returnTo,
}: SocialLoginActionsProps) {
  // Back from the provider after a full-tab sign-in (its window was
  // blocked): the answer waits for this pop-up, which opens already saying
  // it is signing in, as it looked when the tab left.
  const [redirectReturn] = useState(peekOauthRedirectResult);
  const [loadingProvider, setLoadingProvider] = useState<
    "google" | "github" | null
  >(redirectReturn?.provider ?? null);
  // "popup": waiting on the provider's window; "verifying": its code is
  // being exchanged for a session here, inside the login pop-up.
  const [popupStage, setPopupStage] = useState<"popup" | "verifying" | null>(
    redirectReturn ? "verifying" : null,
  );
  const redirectReturnStartedRef = useRef(false);
  const oauthUrlMutation = useOauthUrl();
  const oauthLoginMutation = useOauthLogin();
  const navigate = useNavigate();
  const stopListeningRef = useRef<(() => void) | null>(null);
  // Whether Google would sign the visitor in without asking anything; asked
  // as the pop-up opens.
  const googleSilentCheckRef = useGoogleSilentSignInCheck(!redirectReturn);

  useEffect(() => () => stopListeningRef.current?.(), []);

  const reset = () => {
    clearOauthHandoff();
    setLoadingProvider(null);
    setPopupStage(null);
  };

  const fail = (err: unknown, fallback: string) => {
    reset();
    const errorObj = err as { message?: string } | null;
    onError?.(errorObj?.message || fallback);
  };

  const finishFromPopup = async (
    provider: "google" | "github",
    params: URLSearchParams,
    redirectUri: string,
  ) => {
    const code = params.get("code") ?? params.get("token");
    const error = params.get("error");
    if (error || !code) {
      // Closing Google's window or pressing Cancel there is not a failure
      // worth a message; anything else is.
      if (error === "access_denied") {
        reset();
        return;
      }
      fail(
        null,
        params.get("error_description") ||
          "Authentication was cancelled or failed.",
      );
      return;
    }

    setPopupStage("verifying");
    try {
      const response = await oauthLoginMutation.mutateAsync({
        provider,
        code,
        state: params.get("state") ?? undefined,
        redirectUri,
      });
      clearOauthHandoff();
      authStore.setUser(response.user);
      navigate(resolvePostAuthPath(response, returnTo), { replace: true });
    } catch (err: unknown) {
      fail(err, "Authentication failed. Please try again.");
    }
  };

  useEffect(() => {
    if (!redirectReturn || redirectReturnStartedRef.current) return;
    redirectReturnStartedRef.current = true;
    clearOauthRedirectResult();
    void finishFromPopup(
      redirectReturn.provider,
      redirectReturn.params,
      `${window.location.origin}/auth/callback`,
    );
    // Once, on opening; the handlers are this render's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const googleBusy = oneTapPending || loadingProvider === "google";
  const actionsLocked =
    oneTapPending || (loadingProvider !== null && popupStage !== "popup");

  /**
   * Carries on in the provider's window, or in the whole tab when the
   * window was blocked.
   */
  const continueInWindow = (
    provider: "google" | "github",
    popup: Window | null,
    url: string,
    redirectUri: string,
  ) => {
    if (!popup || popup.closed) {
      // The pop-up is shown now as it will be on the way back, and a copy
      // of it is kept so the page can put it up from its first frame (see
      // loginDialogSnapshot).
      flushSync(() => setPopupStage("verifying"));
      rememberOauthDialogPage();
      rememberLoginDialogSnapshot();
      window.location.href = url;
      return;
    }

    popup.location.href = url;
    stopListeningRef.current = listenForOauthPopup(popup, (outcome) => {
      if (outcome.kind === "result") {
        stopListeningRef.current = null;
        void finishFromPopup(provider, outcome.params, redirectUri);
        return;
      }
      // Closed without an answer: the buttons work again. The listener
      // stays, in case the answer is still on its way.
      reset();
    });
  };

  const handleOauth = async (provider: "google" | "github") => {
    if (actionsLocked) return;
    cancelGoogleOneTap();
    stopListeningRef.current?.();
    stopListeningRef.current = null;
    setLoadingProvider(provider);

    // Written before the window opens: it starts with a copy of this tab's
    // session storage, which it needs if it has to finish signing in itself.
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, provider);
    if (returnTo) {
      sessionStorage.setItem(OAUTH_RETURN_TO_STORAGE_KEY, returnTo);
    } else {
      sessionStorage.removeItem(OAUTH_RETURN_TO_STORAGE_KEY);
    }
    const redirectUri = `${window.location.origin}/auth/callback`;
    const providerName = provider === "google" ? "Google" : "GitHub";

    // When Google would sign the visitor in without asking anything (one
    // account that has agreed before), a window opened here only flashed
    // open and shut. Then the sign-in runs in a hidden frame instead, and a
    // window opens only if Google asks for the visitor after all.
    const silentCheck =
      provider === "google" ? googleSilentCheckRef.current : null;
    if (silentCheck && silentCheck.settled !== false) {
      try {
        const silent =
          silentCheck.settled ??
          (await Promise.race([
            silentCheck.answer,
            new Promise<boolean>((resolve) =>
              window.setTimeout(() => resolve(false), SILENT_CHECK_WAIT_MS),
            ),
          ]));
        if (silent) {
          setPopupStage("verifying");
          const response = await oauthUrlMutation.mutateAsync({
            provider,
            redirectUri,
          });
          if (!response.url) {
            throw new Error("The OAuth provider did not return a login URL.");
          }
          const answer = await askOauthProviderSilently(response.url);
          if (answer?.has("code")) {
            await finishFromPopup(provider, answer, redirectUri);
            return;
          }
          // Google wants the visitor after all (signed out since, or a
          // second account). The window opens now, after the wait; should
          // the browser block it for that, the whole tab goes instead.
          silentCheck.markNeedsVisitor();
          const popup = openOauthPopup(providerName);
          setPopupStage(popup ? "popup" : null);
          continueInWindow(provider, popup, response.url, redirectUri);
          return;
        }
      } catch (err: unknown) {
        fail(err, "Unable to initialize social login. Please try again.");
        return;
      }
    }

    // Opened now, in the click, or the browser blocks it. When it is
    // blocked anyway the whole tab goes to the provider, as it used to.
    const popup = openOauthPopup(providerName);
    if (popup) setPopupStage("popup");

    try {
      const response = await oauthUrlMutation.mutateAsync({
        provider,
        redirectUri,
      });

      if (!response.url) {
        throw new Error("The OAuth provider did not return a login URL.");
      }

      continueInWindow(provider, popup, response.url, redirectUri);
    } catch (err: unknown) {
      popup?.close();
      fail(err, "Unable to initialize social login. Please try again.");
    }
  };

  const providerLabel = loadingProvider === "github" ? "GitHub" : "Google";
  const pendingMessage = oneTapPending
    ? "Verifying your Google account…"
    : popupStage === "popup"
      ? `Finish signing in with ${providerLabel} in the window that opened.`
      : popupStage === "verifying"
        ? "Signing you in…"
        : null;

  return (
    <div className="auth-social">
      <p className="auth-social__divider">
        <span>OR</span>
      </p>

      {pendingMessage ? (
        <p className="auth-form__pending" role="status">
          {pendingMessage}
        </p>
      ) : null}

      <div className="auth-social__actions">
        <button
          aria-busy={googleBusy}
          aria-label={googleBusy ? "Verifying Google sign-in" : undefined}
          className={googleButtonClasses}
          disabled={actionsLocked}
          onClick={() => handleOauth("google")}
          type="button"
        >
          <GoogleBrandIcon size={20} />
          {googleBusy ? (
            <>
              <LoadingSpinnerIcon size={18} className="text-current!" />
              {popupStage === "popup" ? "Waiting for Google…" : "Verifying…"}
            </>
          ) : (
            "Continue with Google"
          )}
        </button>

        {/* Off for now (see SHOW_GITHUB_SIGN_IN); the sign-in itself still
            works and the API keeps its GitHub routes. */}
        {SHOW_GITHUB_SIGN_IN ? (
          <button
            aria-busy={loadingProvider === "github"}
            aria-label={
              loadingProvider === "github" ? "Connecting to GitHub" : undefined
            }
            className="auth-social__button"
            disabled={actionsLocked}
            onClick={() => handleOauth("github")}
            type="button"
          >
            <GitHubBrandIcon size={18} />
            {loadingProvider === "github" ? (
              <LoadingSpinnerIcon size={18} />
            ) : (
              "Continue with GitHub"
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
