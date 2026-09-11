// ---------------------------------------------------------------------------
// MedGuard AI demo authentication helper.
// IMPORTANT: localStorage authentication is for frontend prototyping only.
// Replace these functions with API calls + secure httpOnly cookies/JWT before
// using this application with real users or health data.
// ---------------------------------------------------------------------------

const USER_KEY = "user";
const ACCOUNT_KEY = "medguard_demo_account";

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getStoredUser()?.isLoggedIn);
}

export function registerDemoAccount({ name, email, password }) {
  const account = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
  };

  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      name: account.name,
      email: account.email,
      isLoggedIn: true,
    })
  );

  return { name: account.name, email: account.email };
}

export function authenticateDemoAccount(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  let account = null;
  try {
    account = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null");
  } catch {
    account = null;
  }

  // Demo fallback: existing users can still enter any non-empty password.
  // Once signup has created an account, validate the saved demo credentials.
  if (account) {
    if (account.email !== normalizedEmail || account.password !== password) {
      throw new Error("Incorrect email or password.");
    }
    return { name: account.name, email: account.email };
  }

  if (!normalizedEmail || !password) {
    throw new Error("Unable to sign in. Please check your email and password.");
  }

  return { name: "User", email: normalizedEmail };
}

export function saveLoggedInUser(user) {
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      name: user.name || "User",
      email: user.email,
      isLoggedIn: true,
    })
  );
}

export function logoutUser() {
  localStorage.removeItem(USER_KEY);
}

export function updateStoredUser(updates) {
  const current = getStoredUser() || {};
  const next = { ...current, ...updates, isLoggedIn: true };
  localStorage.setItem(USER_KEY, JSON.stringify(next));
  return next;
}
