// src/utils/auth.js
import { ALLOWED_USERS, STORAGE_KEY_RATER } from "../config/appConfig";

export function getRater() {
  try {
    return localStorage.getItem(STORAGE_KEY_RATER) || "";
  } catch {
    return "";
  }
}

export function setRater(name) {
  const upper = String(name || "").trim().toUpperCase();
  if (!ALLOWED_USERS.includes(upper)) {
    throw new Error("Not an allowed user");
  }
  try {
    localStorage.setItem(STORAGE_KEY_RATER, upper);
  } catch {}
  return upper;
}

export function clearRater() {
  try {
    localStorage.removeItem(STORAGE_KEY_RATER);
  } catch {}
}

export function isAllowed(name) {
  const upper = String(name || "").trim().toUpperCase();
  return ALLOWED_USERS.includes(upper);
}
