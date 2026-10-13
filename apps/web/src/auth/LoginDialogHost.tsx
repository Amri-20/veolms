import { Suspense, useCallback, useEffect, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  LOGIN_DIALOG_PARAM,
  sanitizeReturnTo,
  stripLoginDialogParams,
} from "../routing/routeAccess";
import { loginDialogBody } from "../routing/prerenderedBodies";
import { useSessionAccess } from "../routing/RouteGuards";

// The login card and its styles load only when someone asks to log in. Once
// they have loaded the pop-up renders at once, where a bare `lazy()` would
// still show its (empty) fallback first and hold the pop-up back behind it.
const LoginDialog = loginDialogBody.Body;

const subscribeToNothing = () => () => {};

/**
 * Opens the login pop-up over the current page whenever the address carries
 * `?login=1`, so it can be linked to, reloaded and closed with Back like any
 * other place in the app. `returnTo` in the address names a page to open
 * after signing in, for pages a signed-out visitor cannot stay on.
 *
 * Once the visitor is signed in the parameters are dropped: the pop-up
 * closes and the page behind it shows their signed-in state.
 */
export function LoginDialogHost() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSessionReady = useSessionAccess().access.isSessionReady;
  // A page built ahead of time has no pop-up in it, whatever its address
  // says. The first render in the browser has to match that page, so the
  // pop-up is added straight after it instead of during it.
  const pageIsHydrated = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  const params = new URLSearchParams(location.search);
  const requested = params.has(LOGIN_DIALOG_PARAM);
  const pagePath = `${location.pathname}${stripLoginDialogParams(location.search)}${location.hash}`;
  const destination = sanitizeReturnTo(params.get("returnTo")) ?? pagePath;

  const close = useCallback(
    () => void navigate(pagePath, { replace: true }),
    [navigate, pagePath],
  );
  const finish = useCallback(
    () => void navigate(destination, { replace: true }),
    [destination, navigate],
  );

  // Also covers arriving on a login link while already signed in.
  useEffect(() => {
    if (requested && isSessionReady) finish();
  }, [finish, isSessionReady, requested]);

  if (!pageIsHydrated || !requested || isSessionReady) return null;

  return (
    <Suspense fallback={null}>
      <LoginDialog
        returnTo={destination}
        onClose={close}
        onAuthenticated={finish}
      />
    </Suspense>
  );
}
