'use client';
import { useSyncExternalStore } from 'react';
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('roadtrip-preference', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('roadtrip-preference', callback);
  };
}
const memory = new Map<string, string>();
function read(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? fallback;
  } catch {
    return memory.get(key) ?? fallback;
  }
}
export function usePreference(key: string, fallback: string) {
  const value = useSyncExternalStore(
    subscribe,
    () =>
      read(
        key,
        key === 'roadtrip-theme' && window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : fallback,
      ),
    () => fallback,
  );
  function update(next: string) {
    memory.set(key, next);
    try {
      localStorage.setItem(key, next);
    } catch {
      /* Session-only preference when storage is unavailable. */
    }
    window.dispatchEvent(new Event('roadtrip-preference'));
  }
  return [value, update] as const;
}
