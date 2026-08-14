import { useEffect, useRef, useState } from 'react';
import { List } from 'lucide-react';

export interface CategoriaMenuItem { id: string; label: string }

/**
 * Menu lateral com as categorias da ficha. Clicar rola até a seção.
 * Ctrl+M (tratado na página) foca o menu.
 */
const FichaCategoriaMenu = ({ items, menuRef }: { items: CategoriaMenuItem[]; menuRef?: React.RefObject<HTMLDivElement> }) => {
  const [aberto, setAberto] = useState(false);
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
    setAberto(false);
  };

  const lista = (
    <nav className="flex flex-col gap-0.5" aria-label="Categorias da ficha">
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

  return (
    <>
      {/* Desktop: coluna fixa */}
      <div ref={ref} tabIndex={-1} className="hidden lg:block sticky top-24 self-start w-44 shrink-0 outline-none">
        <div className="bg-card border border-border rounded-xl p-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-2 py-1">Ficha</p>
          {lista}
        </div>
      </div>

      {/* Mobile: barra recolhível */}
      <div className="lg:hidden mb-3">
        <button
          type="button"
          onClick={() => setAberto(v => !v)}
          className="inline-flex items-center gap-2 text-xs font-semibold border border-border rounded-lg px-3 py-1.5 bg-card"
        >
          <List size={14} /> Categorias da ficha
        </button>
        {aberto && <div className="mt-2 bg-card border border-border rounded-xl p-2">{lista}</div>}
      </div>
    </>
  );
};

export default FichaCategoriaMenu;
