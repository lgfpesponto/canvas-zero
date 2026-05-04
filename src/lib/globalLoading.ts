/**
 * Global loading indicator: tracks any in-flight HTTP request.
 *
 * IMPORTANTE: o monkey-patch global de window.fetch foi REMOVIDO porque
 * estava interferindo com Auth/Realtime do Supabase (locks, refresh, etc.)
 * e causando travamento da tela de login.
 *
 * As funções startLoading/endLoading/subscribeLoading continuam disponíveis
 * para quem quiser registrar manualmente, mas nada mais é instalado no
 * window.fetch.
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
  try { listener(inflight); } catch { /* noop */ }
  return () => { listeners.delete(listener); };
}
