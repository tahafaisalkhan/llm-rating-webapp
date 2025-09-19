// src/utils/auth.js
import { CREDENTIALS, STORAGE_KEY_RATER } from "../config/appConfig";

export function getRater() {
  try {
    return localStorage.getItem(STORAGE_KEY_RATER) || "";
  } catch {
    return "";
  }
}

export function setRater(name) {
  const key = String(name || "").trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(CREDENTIALS, key)) {
    throw new Error("Not an allowed user");
  }
  try {
    localStorage.setItem(STORAGE_KEY_RATER, key);
  } catch {}
  return key;
}

export function clearRater() {
  try {
    localStorage.removeItem(STORAGE_KEY_RATER);
  } catch {}
}

/** Username + password check */
export function isAllowed(name, password) {
  const key = String(name || "").trim().toLowerCase();
  const pwd = String(password || "");
  return Object.prototype.hasOwnProperty.call(CREDENTIALS, key) && CREDENTIALS[key] === pwd;
}
