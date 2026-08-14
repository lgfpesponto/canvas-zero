import { useEffect, useRef, useState } from 'react';
import { focusFirstInSection } from '@/lib/fichaNav';


export interface CategoriaMenuItem { id: string; label: string }

/**
 * Menu com as categorias da ficha. Clicar rola até a seção.
 * Desktop: coluna fixa à esquerda. Mobile: painel controlado pela página.
 * Ctrl+M (tratado na página) foca o menu.
 */
const FichaCategoriaMenu = ({
  items,
  menuRef,
  variant = 'desktop',
  onNavigate,
  children,
  className = '',
}: {
  items: CategoriaMenuItem[];
  menuRef?: React.RefObject<HTMLDivElement>;
  variant?: 'desktop' | 'inline';
  onNavigate?: () => void;
  children?: React.ReactNode;
  className?: string;
}) => {

  const localRef = useRef<HTMLDivElement>(null);
  const ref = menuRef || localRef;
  const [ativo, setAtivo] = useState<string>('');

  useEffect(() => {
    const onScroll = () => {
      let atual = '';
      items.forEach(i => {
        const el = document.getElementById(i.id);
        if (el && el.getBoundingClientRect().top <= 160) atual = i.id;
      });
      setAtivo(atual);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [items]);

  const irPara = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onNavigate?.();
    setTimeout(() => focusFirstInSection(el), 450);
  };

  const onItemKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      irPara(items[idx].id);
      return;
    }
    if (e.key === 'Escape') {
      (e.currentTarget as HTMLElement).blur();
      return;
    }
    const prox = e.key === 'ArrowDown' || e.key === 'ArrowRight';
    const ant = e.key === 'ArrowUp' || e.key === 'ArrowLeft';
    if (!prox && !ant) return;
    e.preventDefault();
    const botoes = Array.from(
      (e.currentTarget.closest('nav') as HTMLElement | null)?.querySelectorAll<HTMLElement>('[data-ficha-menu-item="true"]') || [],
    );
    const alvo = prox ? Math.min(botoes.length - 1, idx + 1) : Math.max(0, idx - 1);
    botoes[alvo]?.focus();
  };

  const lista = (
    <nav className="flex flex-col gap-0.5" aria-label="Menu da ficha">
      {items.map((i, idx) => (
        <button
          key={i.id}
          type="button"
          data-ficha-menu-item="true"
          data-ficha-nav="false"
          onClick={() => irPara(i.id)}
          onKeyDown={(e) => onItemKeyDown(e, idx)}
          className={`text-left text-[11px] px-1.5 py-1 rounded-md transition-colors outline-none focus:ring-2 focus:ring-primary/60 ${
            ativo === i.id ? 'bg-primary/15 text-primary font-semibold' : 'hover:bg-muted text-muted-foreground'
          }`}
        >
          {i.label}
        </button>
      ))}
    </nav>
  );


  if (variant === 'inline') {
    return <div className="bg-card border border-border rounded-xl p-2">{lista}</div>;
  }

  return (
    <div ref={ref} tabIndex={-1} className={`${className || 'hidden lg:block'} sticky top-24 self-start w-36 shrink-0 outline-none space-y-3`}>
      <div className="bg-card border border-border rounded-xl p-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground px-1.5 py-1">Menu</p>
        {lista}
      </div>
      {children}
    </div>
  );

};

export default FichaCategoriaMenu;
