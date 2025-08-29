import { ALLOWED_USERS, STORAGE_KEY_RATER } from "../config/appConfig";

export function getRater() {
  try {
    return localStorage.getItem(STORAGE_KEY_RATER) || null;
  } catch {
    return null;
  }
}

export function setRater(name) {
  const upper = (name || "").trim().toUpperCase();
  if (!ALLOWED_USERS.includes(upper)) throw new Error("Not an allowed user");
  localStorage.setItem(STORAGE_KEY_RATER, upper);
  return upper;
}

export function clearRater() {
  try { localStorage.removeItem(STORAGE_KEY_RATER); } catch {}
}

export function isAllowed(name) {
  return ALLOWED_USERS.includes((name || "").trim().toUpperCase());
}
