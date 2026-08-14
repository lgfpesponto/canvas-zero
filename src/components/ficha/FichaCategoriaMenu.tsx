import { useEffect, useRef, useState } from 'react';

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
  };

  const lista = (
    <nav className="flex flex-col gap-0.5" aria-label="Menu da ficha">
      {items.map(i => (
        <button
          key={i.id}
          type="button"
          onClick={() => irPara(i.id)}
          className={`text-left text-xs px-2 py-1.5 rounded-md transition-colors ${
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
    <div ref={ref} tabIndex={-1} className={`${className || 'hidden lg:block'} sticky top-24 self-start w-44 shrink-0 outline-none space-y-3`}>
      <div className="bg-card border border-border rounded-xl p-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-2 py-1">Menu</p>
        {lista}
      </div>
      {children}
    </div>
  );

};

export default FichaCategoriaMenu;
