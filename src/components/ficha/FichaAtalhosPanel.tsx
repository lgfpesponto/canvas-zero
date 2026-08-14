import { Keyboard } from 'lucide-react';

export interface AtalhoItem { combo: string; desc: string }

/** Painel explicativo dos atalhos da ficha (fica fora do formulário). */
const FichaAtalhosPanel = ({ atalhos }: { atalhos: AtalhoItem[] }) => (
  <div className="bg-muted/50 border border-border rounded-xl p-4 mb-4">
    <div className="flex items-center gap-2 mb-2">
      <Keyboard size={16} className="text-primary" />
      <span className="text-sm font-bold uppercase tracking-wide">Atalhos do teclado</span>
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
      {atalhos.map(a => (
        <div key={a.combo} className="flex items-center gap-2 text-xs">
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-background font-mono text-[11px] whitespace-nowrap">{a.combo}</kbd>
          <span className="text-muted-foreground">{a.desc}</span>
        </div>
      ))}
    </div>
    <p className="text-[11px] text-muted-foreground mt-2">
      Enter avança para o próximo campo. Nos campos de seleção dá para escolher com o mouse ou com as setas do teclado + Enter.
      Nos campos de múltipla seleção o Enter marca a opção; use a seta para o lado para passar sem marcar e clique fora (ou Tab) para seguir.
    </p>
  </div>
);

export default FichaAtalhosPanel;
