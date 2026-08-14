import { useEffect, RefObject } from 'react';
import { focusNextFrom, focusFirst, FICHA_FOCUS_OPEN, abrirSelectNativo } from '@/lib/fichaNav';

/**
 * Ativa a navegação por Enter dentro de um formulário de ficha.
 * - O listener roda em fase de CAPTURA para decidir antes dos componentes
 *   (Radix Popover, select nativo) que também tratam Enter.
 * - Enter em campo de seleção fechado abre a lista; nos demais avança.
 * - Enter em textarea avança (Shift+Enter quebra linha).
 * - Nunca submete o formulário por Enter.
 */
export function useFichaKeyboardNav(
  formRef: RefObject<HTMLFormElement | HTMLElement>,
  opts?: { enabled?: boolean; autoFocusFirst?: boolean },
) {
  const enabled = opts?.enabled !== false;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== 'Enter' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      const form = formRef.current;
      if (!form || !form.contains(target)) return;
      if (target.closest('[data-ficha-enter-manual="true"]')) return;

      // Textarea: Shift+Enter quebra linha, Enter avança.
      if (target.tagName === 'TEXTAREA') {
        if (ev.shiftKey) return;
        ev.preventDefault();
        ev.stopPropagation();
        focusNextFrom(target);
        return;
      }
      if (ev.shiftKey) return;

      // Campo de seleção customizado (SearchableSelect): abre a lista se fechado.
      if (target.getAttribute('data-ficha-nav') === 'true' && target.getAttribute('role') === 'combobox') {
        if (target.getAttribute('aria-expanded') === 'true') return; // Radix trata
        ev.preventDefault();
        ev.stopPropagation();
        target.dispatchEvent(new CustomEvent(FICHA_FOCUS_OPEN, { bubbles: false }));
        return;
      }

      // Select nativo (Tem / Não tem) trata o próprio Enter.
      if (target.tagName === 'SELECT') return;

      // Botões que não fazem parte da navegação: comportamento padrão.
      if (target.tagName === 'BUTTON' && target.getAttribute('data-ficha-nav') !== 'true') return;

      ev.preventDefault();
      ev.stopPropagation();
      focusNextFrom(target);
    };

    // Escuta no documento (captura) para funcionar mesmo se o form montar depois.
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [formRef, enabled]);

  // Foco inicial: espera os campos existirem (as variações vêm do banco).
  useEffect(() => {
    if (!enabled || !opts?.autoFocusFirst) return;
    let done = false;
    let obs: MutationObserver | null = null;
    const tentar = () => {
      if (done) return;
      const root = formRef.current;
      if (!root) return;
      if (!obs) {
        obs = new MutationObserver(tentar);
        obs.observe(root, { childList: true, subtree: true });
      }
      const ativo = document.activeElement as HTMLElement | null;
      if (ativo && ativo !== document.body && root.contains(ativo)) { done = true; return; }
      if (focusFirst(root)) done = true;
    };
    tentar();
    const interval = setInterval(tentar, 200);
    const stop = setTimeout(() => { done = true; clearInterval(interval); obs?.disconnect(); }, 10000);
    return () => { clearInterval(interval); clearTimeout(stop); obs?.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, opts?.autoFocusFirst]);
}

export default useFichaKeyboardNav;
