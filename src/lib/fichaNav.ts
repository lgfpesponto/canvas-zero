/**
 * Navegação sequencial da ficha (Enter avança para o próximo campo).
 *
 * Regras:
 * - Elementos navegáveis: inputs, selects, textareas e qualquer elemento com
 *   `data-ficha-nav="true"` (usado pelos selects customizados / multipla seleção).
 * - Qualquer elemento dentro de um container com `data-ficha-nav-skip="true"`
 *   é ignorado (ex.: checkboxes internas dos campos de múltipla seleção).
 * - A ordem é a ordem VISUAL (posição na tela), não a ordem do DOM.
 */

export const NAV_SELECTOR = [
  'input:not([type="hidden"]):not([disabled]):not([readonly])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[data-ficha-nav="true"]',
].join(', ');

/** Evento disparado no campo que recebe o foco pela navegação (selects abrem a lista). */
export const FICHA_FOCUS_OPEN = 'ficha:focus-open';

const isVisible = (el: HTMLElement) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

/** Lista, em ordem visual, os campos navegáveis dentro de um container/form. */
export function getNavElements(root: HTMLElement | null | undefined): HTMLElement[] {
  if (!root) return [];
  const list = Array.from(root.querySelectorAll<HTMLElement>(NAV_SELECTOR)).filter(el => {
    if (!isVisible(el)) return false;
    if (el.getAttribute('data-ficha-nav') === 'false') return false;
    const skipParent = el.closest('[data-ficha-nav-skip="true"]');
    if (skipParent && el.getAttribute('data-ficha-nav') !== 'true') return false;
    return true;
  });
  return list
    .map((el, i) => {
      const r = el.getBoundingClientRect();
      return { el, i, top: Math.round(r.top + window.scrollY), left: Math.round(r.left) };
    })
    .sort((a, b) => {
      // mesma "linha" (tolerância de 12px) → ordena pela esquerda
      if (Math.abs(a.top - b.top) <= 12) return a.left - b.left || a.i - b.i;
      return a.top - b.top;
    })
    .map(x => x.el);
}

const rootOf = (el: HTMLElement) =>
  (el.closest('form') || el.closest('[data-ficha-nav-root]')) as HTMLElement | null;

/** Foca um campo e avisa (evento) para que selects abram a lista. */
export function focusNavElement(el: HTMLElement | null | undefined) {
  if (!el) return;
  el.focus({ preventScroll: true });
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    try { el.select(); } catch { /* noop */ }
  }
  el.scrollIntoView({ block: 'center' });
  el.dispatchEvent(new CustomEvent(FICHA_FOCUS_OPEN, { bubbles: false }));
}

/** Move o foco para o próximo campo navegável depois de `el`. */
export function focusNextFrom(el: HTMLElement | null | undefined) {
  if (!el) return;
  const list = getNavElements(rootOf(el) || document.body);
  const idx = list.indexOf(el);
  const next = idx >= 0 ? list[idx + 1] : undefined;
  if (!next) return;
  focusNavElement(next);
}

/** Foca o primeiro campo navegável do container (usado ao abrir a ficha). */
export function focusFirst(root: HTMLElement | null | undefined) {
  const list = getNavElements(root);
  if (!list[0]) return false;
  list[0].focus({ preventScroll: true });
  return true;
}
