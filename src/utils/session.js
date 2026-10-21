// "Remember me" support.
//
// Login stores the token in localStorage, which normally survives closing the
// browser. When "Remember me" is NOT ticked we also set a *session cookie*
// (a cookie with no expiry). The browser deletes it when it is closed. On the
// next start, if the token is there but "Remember me" is off and the cookie is
// gone, the old login is cleared, so the user has to log in again.

const MARKER = "mg_session";

export function markSession() {
  try {
    document.cookie = `${MARKER}=1; path=/; SameSite=Lax`;
  } catch {
    /* cookies blocked: ignore */
  }
}

function hasMarker() {
  try {
    return document.cookie.split("; ").some((c) => c.startsWith(`${MARKER}=`));
  } catch {
    return true; // cannot tell, so do not log the user out
  }
}

export function enforceRememberMe() {
  try {
    const hasToken = Boolean(localStorage.getItem("access_token"));
    const remember = localStorage.getItem("rememberMe") === "true";

    if (hasToken && !remember && !hasMarker()) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      localStorage.removeItem("rememberMe");
    }
  } catch {
    /* storage blocked: ignore */
  }
}
