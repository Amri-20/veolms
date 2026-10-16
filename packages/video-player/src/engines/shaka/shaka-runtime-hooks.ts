// Lets an extension adjust the Shaka runtime as soon as it is loaded, before
// any player is created from it (for example to patch Player.prototype).
// The default runtime loader calls notifyShakaRuntimeLoaded after every
// load, so an extension no longer has to download Shaka on every page just
// to be sure its changes are in place before the first player.
//
// The state lives on globalThis so that a second copy of this module, if a
// bundle ever ends up with one, still sees the same hooks and runtime.

export type ShakaRuntimeHook = (runtimeModule: unknown) => void;

interface ShakaRuntimeHookState {
  hooks: Set<ShakaRuntimeHook>;
  loaded: boolean;
  runtimeModule: unknown;
}

const STATE_KEY = Symbol.for("veolms.video-player.shaka-runtime-hooks");

function hookState(): ShakaRuntimeHookState {
  const store = globalThis as unknown as Record<
    symbol,
    ShakaRuntimeHookState | undefined
  >;
  let state = store[STATE_KEY];
  if (!state) {
    state = { hooks: new Set(), loaded: false, runtimeModule: undefined };
    store[STATE_KEY] = state;
  }
  return state;
}

function runHook(hook: ShakaRuntimeHook, runtimeModule: unknown): void {
  try {
    hook(runtimeModule);
  } catch {
    // A failing extension must not stop playback.
  }
}

/**
 * Runs `hook` with the Shaka module every time the default loader loads it,
 * and at once if it has already been loaded. Returns an unsubscribe function.
 */
export function onShakaRuntimeLoaded(hook: ShakaRuntimeHook): () => void {
  const state = hookState();
  state.hooks.add(hook);
  if (state.loaded) runHook(hook, state.runtimeModule);
  return () => {
    state.hooks.delete(hook);
  };
}

/** Called by the default runtime loader once the Shaka module is loaded. */
export function notifyShakaRuntimeLoaded(runtimeModule: unknown): void {
  const state = hookState();
  if (state.loaded && state.runtimeModule === runtimeModule) return;
  state.loaded = true;
  state.runtimeModule = runtimeModule;
  for (const hook of state.hooks) runHook(hook, runtimeModule);
}
