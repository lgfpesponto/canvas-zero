import { useEffect, RefObject } from 'react';
import { focusNextFrom, focusFirst, FICHA_FOCUS_OPEN } from '@/lib/fichaNav';

/**
 * Ativa a navegação por Enter dentro de um formulário de ficha.
 * - O listener roda em fase de CAPTURA para decidir antes dos componentes
 *   (Radix Popover, select nativo) que também tratam Enter.
 * - Enter em campo de seleção fechado abre a lista; nos demais avança.
 * - Nunca submete o formulário por Enter.
 */
export function useFichaKeyboardNav(
  formRef: RefObject<HTMLFormElement | HTMLElement>,
  opts?: { enabled?: boolean; autoFocusFirst?: boolean },
) {
  const enabled = opts?.enabled !== false;

  useEffect(() => {
    const el = formRef.current;
    if (!el || !enabled) return;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== 'Enter' || ev.ctrlKey || ev.metaKey || ev.altKey || ev.shiftKey) return;
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === 'TEXTAREA') return;
      if (target.closest('[data-ficha-enter-manual="true"]')) return;

      // Campo de seleção customizado (SearchableSelect): abre a lista se fechado.
      if (target.getAttribute('data-ficha-nav') === 'true' && target.getAttribute('role') === 'combobox') {
        if (target.getAttribute('aria-expanded') === 'true') return; // Radix trata
        ev.preventDefault();
        ev.stopPropagation();
        target.dispatchEvent(new CustomEvent(FICHA_FOCUS_OPEN, { bubbles: false }));
        return;
      }

      // Botões que não fazem parte da navegação: comportamento padrão.
      if (target.tagName === 'BUTTON' && target.getAttribute('data-ficha-nav') !== 'true') return;

      ev.preventDefault();
      ev.stopPropagation();
      focusNextFrom(target);
    };
    el.addEventListener('keydown', onKeyDown, true);
    return () => el.removeEventListener('keydown', onKeyDown, true);
  }, [formRef, enabled]);

  // Foco inicial: espera os campos existirem (as variações vêm do banco).
  useEffect(() => {
    if (!enabled || !opts?.autoFocusFirst) return;
    let done = false;
    const tentar = () => {
      if (done) return;
      const ativo = document.activeElement as HTMLElement | null;
      if (ativo && ativo !== document.body && ativo.tagName !== 'DIV') { done = true; return; }
      if (focusFirst(formRef.current)) done = true;
    };
    tentar();
    const obs = new MutationObserver(tentar);
    if (formRef.current) obs.observe(formRef.current, { childList: true, subtree: true });
    const interval = setInterval(tentar, 300);
    const stop = setTimeout(() => { done = true; clearInterval(interval); obs.disconnect(); }, 6000);
    return () => { clearInterval(interval); clearTimeout(stop); obs.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, opts?.autoFocusFirst]);
}

export default useFichaKeyboardNav;
