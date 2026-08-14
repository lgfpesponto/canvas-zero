/**
 * Navegação sequencial da ficha (Enter avança para o próximo campo).
 *
 * Regras:
 * - Elementos navegáveis: inputs, selects, textareas e qualquer elemento com
 *   `data-ficha-nav="true"` (usado pelos selects customizados / multipla seleção).
 * - Qualquer elemento dentro de um container com `data-ficha-nav-skip="true"`
 *   é ignorado (ex.: checkboxes internas dos campos de múltipla seleção).
 */

export const NAV_SELECTOR = [
  'input:not([type="hidden"]):not([disabled]):not([readonly])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[data-ficha-nav="true"]',
].join(', ');

const isVisible = (el: HTMLElement) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

/** Lista, em ordem visual, os campos navegáveis dentro de um container/form. */
export function getNavElements(root: HTMLElement | null | undefined): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(NAV_SELECTOR)).filter(el => {
    if (!isVisible(el)) return false;
    if (el.getAttribute('data-ficha-nav') === 'false') return false;
    const skipParent = el.closest('[data-ficha-nav-skip="true"]');
    if (skipParent && el.getAttribute('data-ficha-nav') !== 'true') return false;
    return true;
  });
}

/** Move o foco para o próximo campo navegável depois de `el`. */
export function focusNextFrom(el: HTMLElement | null | undefined) {
  if (!el) return;
  const root = (el.closest('form') || el.closest('[data-ficha-nav-root]')) as HTMLElement | null;
  const list = getNavElements(root || document.body);
  const idx = list.indexOf(el);
  const next = idx >= 0 ? list[idx + 1] : undefined;
  if (!next) return;
  next.focus();
  if (next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement) {
    try { next.select(); } catch { /* noop */ }
  }
  next.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

/** Foca o primeiro campo navegável do container (usado ao abrir a ficha). */
export function focusFirst(root: HTMLElement | null | undefined) {
  const list = getNavElements(root);
  list[0]?.focus();
}
