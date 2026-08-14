import { useEffect, RefObject } from 'react';
import { focusNextFrom, focusFirst } from '@/lib/fichaNav';

/**
 * Ativa a navegação por Enter dentro de um formulário de ficha.
 * - Enter em qualquer campo (exceto textarea e campos marcados com
 *   `data-ficha-enter-manual`) avança para o próximo campo.
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
      if (target.tagName === 'BUTTON' && target.getAttribute('data-ficha-nav') !== 'true') return;
      ev.preventDefault();
      focusNextFrom(target);
    };
    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, [formRef, enabled]);

  useEffect(() => {
    if (!enabled || !opts?.autoFocusFirst) return;
    const t = setTimeout(() => focusFirst(formRef.current), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, opts?.autoFocusFirst]);
}

export default useFichaKeyboardNav;
