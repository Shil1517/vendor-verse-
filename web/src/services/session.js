/*
 * Auth session storage for the real API (F-ACC-01).
 *
 * Holds { accessToken, refreshToken, accessTokenExpiresAt } in localStorage, with an
 * in-memory fallback when storage is unavailable (private mode, blocked site data).
 * Mockup-stage trade-off: tokens in localStorage are readable by any script on the
 * page; revisit (httpOnly cookies or native secure storage) before production.
 */

const KEY = 'vv.session'

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function createSessionStore(storage = defaultStorage()) {
  let memory = null
  return {
    get() {
      try {
        const raw = storage?.getItem(KEY)
        if (raw) return JSON.parse(raw)
      } catch {
        /* fall through to memory */
      }
      return memory
    },
    set(session) {
      memory = session
      try {
        storage?.setItem(KEY, JSON.stringify(session))
      } catch {
        /* memory copy still works for this page load */
      }
    },
    clear() {
      memory = null
      try {
        storage?.removeItem(KEY)
      } catch {
        /* nothing to clear */
      }
    },
  }
}
