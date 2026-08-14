import { Keyboard } from 'lucide-react';

export interface AtalhoItem { combo: string; desc: string }

/** Lista de atalhos (conteúdo do painel). */
export const FichaAtalhosLista = ({ atalhos }: { atalhos: AtalhoItem[] }) => (
  <div className="bg-muted/50 border border-border rounded-xl p-3">
    <div className="flex items-center gap-2 mb-2">
      <Keyboard size={14} className="text-primary" />
      <span className="text-[11px] font-bold uppercase tracking-wide">Atalhos do teclado</span>
    </div>
    <div className="flex flex-col gap-1">
      {atalhos.map(a => (
        <div key={a.combo} className="flex items-start gap-2 text-xs">
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-background font-mono text-[11px] whitespace-nowrap">{a.combo}</kbd>
          <span className="text-muted-foreground">{a.desc}</span>
        </div>
      ))}
    </div>
  </div>
);

export default FichaAtalhosLista;
