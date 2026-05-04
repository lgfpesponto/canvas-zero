/**
 * Global loading indicator: tracks any in-flight HTTP request by wrapping
 * window.fetch. Shows a small "Carregando" chip whenever count > 0.
 *
 * Works automatically for Supabase REST/Auth/Functions, edge functions and
 * any other fetch-based call (including the login flow).
 */

type Listener = (count: number) => void;

let inflight = 0;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => {
    try { l(inflight); } catch { /* noop */ }
  });
}

export function startLoading() {
  inflight += 1;
  emit();
}

export function endLoading() {
  inflight = Math.max(0, inflight - 1);
  emit();
}

export function getLoadingCount() {
  return inflight;
}

export function subscribeLoading(listener: Listener): () => void {
  listeners.add(listener);
  // Emit current value immediately so subscribers sync.
  try { listener(inflight); } catch { /* noop */ }
  return () => { listeners.delete(listener); };
}

// Install fetch wrapper once.
if (typeof window !== 'undefined' && !(window as any).__globalLoadingInstalled) {
  (window as any).__globalLoadingInstalled = true;
  const original = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    startLoading();
    try {
      return await original(...args);
    } finally {
      endLoading();
    }
  };
}
