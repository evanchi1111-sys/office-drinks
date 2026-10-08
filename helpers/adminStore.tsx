import { useSyncExternalStore } from "react";

const KEY = "drink-admin-pw";
let current: string | null = null;
try {
  current = localStorage.getItem(KEY);
} catch {
  current = null;
}
const listeners = new Set<() => void>();

export function setAdminPassword(pw: string | null) {
  current = pw;
  try {
    if (pw) localStorage.setItem(KEY, pw);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

export function getAdminPassword() {
  return current;
}

export function useAdminPassword(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => null,
  );
}

/** Call from mutation errors: drops the stored password when the server rejects it. */
export function handleAdminError(e: unknown) {
  if (e instanceof Error && e.message.includes("管理密碼")) setAdminPassword(null);
}