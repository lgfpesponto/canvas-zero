import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Pencil, Trash2 } from 'lucide-react';
import { EXTRA_PRODUCT_NAME_MAP } from '@/lib/extrasConfig';
import { getOrderDeadlineInfo } from '@/lib/orderDeadline';

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
              const isRevit = order.tipoExtra === 'revitalizador' || order.tipoExtra === 'kit_revitalizador';
              const qtd = isBotaPE
                ? (order.extraDetalhes?.botas?.length || order.quantidade || 1)
                : (order.quantidade || 1);
              // Bota normal e revitalizadores multiplicam preço x quantidade.
              // Bota Pronta Entrega já guarda o total em order.preco.
              // Demais extras: preço unitário (geralmente quantidade = 1).
              const valor = !order.tipoExtra
                ? order.preco * order.quantidade
                : isRevit
                  ? order.preco * (order.quantidade || 1)
                  : order.preco;
              const deadline = getOrderDeadlineInfo(order);
              const deadlineClass = deadline.tone === 'danger'
                ? 'text-destructive font-bold'
                : deadline.tone === 'success'
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground';
              return (
                <>
                  <span className="text-muted-foreground">{formatDateBR(order.dataCriacao, order.horaCriacao)}</span>
                  <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-bold">{order.status}</span>
                  <span className="font-bold text-primary">{formatCurrency(valor)}</span>
                  <span className="text-xs text-muted-foreground">Qtd: {qtd}</span>
                  <span className={`text-xs ${deadlineClass}`}>{deadline.label}</span>
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
            navigate(editPath);
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
