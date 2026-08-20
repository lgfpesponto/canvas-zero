import { supabase } from '@/integrations/supabase/client';

/**
 * Guarda de sessão para uso do portal em VÁRIAS ABAS ao mesmo tempo.
 *
 * Problema real observado: com o portal aberto em duas abas, as duas tentavam
 * renovar a sessão em paralelo. O Supabase rotaciona o refresh token, então a
 * aba que ficou com o token antigo recebia `refresh_token_not_found` (400) e o
 * app tratava isso como "sessão expirada" na hora de salvar um pedido.
 *
 * Correções aqui:
 *  - `ensureFreshSession()` serializa a renovação entre abas com Web Locks
 *    (navigator.locks), relendo o storage antes de decidir renovar — assim a
 *    segunda aba aproveita o token que a primeira acabou de gravar.
 *  - `installSessionRevalidation()` revalida a sessão quando a aba volta ao
 *    foco, que é exatamente quando ela costuma estar com o token velho.
 */

const LOCK_NAME = 'portal-auth-refresh';
/** Margem (ms) antes do vencimento para já considerar que precisa renovar. */
const EXPIRY_MARGIN_MS = 60_000;

type EnsureResult = { ok: boolean; expired: boolean };

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = (navigator as any)?.locks;
  if (locks?.request) {
    return await locks.request(LOCK_NAME, fn);
  }
  return await fn();
}

function isExpiringSoon(expiresAt?: number | null): boolean {
  if (!expiresAt) return true;
  return expiresAt * 1000 - Date.now() < EXPIRY_MARGIN_MS;
}

/**
 * Garante uma sessão válida antes de uma operação crítica (salvar pedido).
 * Retorna `{ ok: true }` quando há sessão utilizável.
 * `expired: true` significa que a sessão realmente acabou (precisa logar).
 */
export async function ensureFreshSession(): Promise<EnsureResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && !isExpiringSoon(session.expires_at)) return { ok: true, expired: false };

    return await withLock(async () => {
      // Relê depois de pegar o lock: outra aba pode ter renovado nesse meio tempo.
      const { data: { session: fresh } } = await supabase.auth.getSession();
      if (fresh && !isExpiringSoon(fresh.expires_at)) return { ok: true, expired: false };

      const { data, error } = await supabase.auth.refreshSession();
      if (data?.session) return { ok: true, expired: false };

      const code = (error as any)?.code || '';
      const status = (error as any)?.status;
      // Token realmente inválido/ausente → sessão perdida.
      const reallyExpired =
        code === 'refresh_token_not_found' ||
        code === 'refresh_token_already_used' ||
        status === 400 ||
        status === 401;

      if (!reallyExpired) {
        // Falha de rede: pode ser temporária — usa a sessão que ainda houver.
        const { data: { session: last } } = await supabase.auth.getSession();
        if (last) return { ok: true, expired: false };
      }
      return { ok: false, expired: true };
    });
  } catch (e) {
    console.error('[sessionGuard] ensureFreshSession exception:', e);
    const { data: { session } } = await supabase.auth.getSession();
    return { ok: !!session, expired: false };
  }
}

let installed = false;

/** Revalida a sessão quando a aba volta ao foco (chamado uma vez no boot). */
export function installSessionRevalidation() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const revalidate = async () => {
    if (document.visibilityState !== 'visible') return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    if (isExpiringSoon(session.expires_at)) {
      await ensureFreshSession();
    }
  };

  document.addEventListener('visibilitychange', revalidate);
  window.addEventListener('focus', revalidate);
}
