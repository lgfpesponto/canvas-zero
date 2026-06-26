import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  nome?: string | null;
  sku?: string | null;
  className?: string;
}

/** Tag pequena e discreta exibida ao lado do número do pedido,
 *  identificando o modelo rascunho de origem (nome + SKU). */
export function TemplateTag({ nome, sku, className = '' }: Props) {
  if (!nome) return null;
  const short = nome.length > 22 ? nome.slice(0, 22) + '…' : nome;
  const label = sku ? `${short} • ${sku}` : short;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1 align-middle rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground max-w-[220px] truncate ${className}`}
        >
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="font-semibold">{nome}</div>
        {sku && <div className="text-muted-foreground">SKU: {sku}</div>}
      </TooltipContent>
    </Tooltip>
  );
}
