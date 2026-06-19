import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Pencil, Trash2 } from 'lucide-react';
import { EXTRA_PRODUCT_NAME_MAP } from '@/lib/extrasConfig';
import { getOrderDeadlineInfo } from '@/lib/orderDeadline';
import { getOrderFinalValue } from '@/lib/order-logic';
import { useLinkedBoot } from '@/hooks/useLinkedBoot';
import { useCanSeeValues } from '@/hooks/useCanSeeValues';
import { toast } from 'sonner';


interface OrderCardProps {
  order: any;
  isAdmin: boolean;
  canDelete?: boolean;
  isSelected: boolean;
  onToggle: (id: string) => void;
  confirmDeleteId: string | null;
  onConfirmDelete: (id: string | null) => void;
  onDelete: (id: string) => void;
  formatCurrency: (v: number) => string;
  formatDateBR: (date: string, time?: string) => string;
  showConferidoTag?: boolean;
}

const OrderCard = React.memo(({
  order, isAdmin, canDelete = false, isSelected, onToggle,
  confirmDeleteId, onConfirmDelete, onDelete,
  formatCurrency, formatDateBR, showConferidoTag = false,
}: OrderCardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const linkedBoot = useLinkedBoot(order);
  const canSeeValues = useCanSeeValues();


  return (
    <div className="bg-card rounded-xl p-4 western-shadow hover:shadow-xl transition-shadow flex items-center gap-3">
      <button onClick={() => onToggle(order.id)} className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-border hover:border-primary'}`}>
        {isSelected && <CheckCircle size={14} className="text-primary-foreground" />}
      </button>

      <div className="flex-1 cursor-pointer" onClick={() => navigate(`/pedido/${order.id}${location.search}`)}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="font-display font-bold">{order.numero}</span>
            {showConferidoTag && order.conferido && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold inline-flex items-center gap-1 align-middle">
                <CheckCircle size={10} /> CONFERIDO
              </span>
            )}
            {order.tipoExtra && <span className="text-xs font-semibold text-primary ml-2">— {EXTRA_PRODUCT_NAME_MAP[order.tipoExtra] || order.tipoExtra}</span>}
            {isAdmin && <span className="text-sm text-muted-foreground ml-2">— {order.vendedor}</span>}
          </div>
          <div className="flex items-center gap-4 text-sm flex-wrap">
            {(() => {
              const isBotaPE = order.tipoExtra === 'bota_pronta_entrega';
              const qtd = isBotaPE
                ? (order.extraDetalhes?.botas?.length || order.quantidade || 1)
                : (order.quantidade || 1);
              // Valor final já considera desconto (se houver) — centralizado em getOrderFinalValue.
              const valor = getOrderFinalValue(order);
              const temDesconto = order.desconto && order.desconto > 0;
              const deadline = getOrderDeadlineInfo(order, linkedBoot);
              const deadlineClass = deadline.tone === 'danger'
                ? 'text-destructive font-bold'
                : deadline.tone === 'success'
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground';
              return (
                <>
                  <span className="text-muted-foreground">{formatDateBR(order.dataCriacao, order.horaCriacao)}</span>
                  <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-bold">{order.status}</span>
                  {canSeeValues && (
                    <span className="font-bold text-primary inline-flex items-center gap-1">
                      {formatCurrency(valor)}
                      {temDesconto && (
                        <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[9px] font-bold">
                          DESC
                        </span>
                      )}
                    </span>
                  )}

                  <span className="text-xs text-muted-foreground">Qtd: {qtd}</span>
                  <span className={`text-xs ${deadlineClass}`}>{deadline.label}</span>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await navigator.clipboard.writeText(`${window.location.origin}/rastreio/${order.id}`);
                        toast.success('Link copiado');
                      } catch {
                        toast.error('Não foi possível copiar');
                      }
                    }}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded border border-border bg-background hover:bg-muted transition-colors"
                    title="Copiar link público de acompanhamento"
                  >
                    Copiar
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`${window.location.origin}/rastreio/${order.id}`, '_blank', 'noopener');
                    }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded orange-gradient text-primary-foreground hover:opacity-90 transition-opacity"
                    title="Abrir página pública de acompanhamento"
                  >
                    Abrir
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => {
            const editPath = order.tipoExtra === 'cinto'
              ? `/pedido/${order.id}/editar-cinto`
              : order.tipoExtra
                ? `/pedido/${order.id}/editar-extra`
                : `/pedido/${order.id}/editar`;
            navigate(`${editPath}${location.search}`);
          }} className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors" title="Editar pedido">
            <Pencil size={16} />
          </button>
          {canDelete && (confirmDeleteId === order.id ? (
            <div className="flex items-center gap-1">
              <button onClick={() => onDelete(order.id)} className="px-2 py-1 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold hover:opacity-90">Confirmar</button>
              <button onClick={() => onConfirmDelete(null)} className="px-2 py-1 rounded-lg bg-muted text-xs font-bold hover:opacity-80">Cancelar</button>
            </div>
          ) : (
            <button onClick={() => onConfirmDelete(order.id)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors" title="Excluir pedido">
              <Trash2 size={16} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

OrderCard.displayName = 'OrderCard';

export default OrderCard;
