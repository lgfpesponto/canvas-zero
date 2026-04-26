import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotificacoes, type Notificacao } from '@/hooks/useNotificacoes';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

function tempoRelativo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'agora';
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d} d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

const NotificacoesBell = () => {
  const { isAdmin, isLoggedIn } = useAuth();
  const { notificacoes, naoLidas, marcarLida, marcarTodasLidas } = useNotificacoes();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!isLoggedIn || isAdmin) return null;

  const handleClick = async (n: Notificacao) => {
    setOpen(false);
    if (!n.lida) marcarLida(n.id);
    navigate(`/pedido/${n.order_id}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-md text-primary hover:bg-primary/10 transition-colors"
          aria-label="Notificações"
        >
          <Bell size={20} />
          {naoLidas > 0 && (
            <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {naoLidas > 99 ? '99+' : naoLidas}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 max-h-[70vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {naoLidas > 0 && (
            <button
              onClick={() => marcarTodasLidas()}
              className="text-xs text-primary hover:underline"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="overflow-y-auto flex-1">
          {notificacoes.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notificacoes.slice(0, 20).map(n => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-2 ${
                      !n.lida ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="mt-1 shrink-0">
                      {!n.lida ? (
                        <span className="block w-2 h-2 rounded-full bg-primary" />
                      ) : (
                        <span className="block w-2 h-2" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm truncate">
                          Pedido {n.numero}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {tempoRelativo(n.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {n.descricao}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        Status: {n.status_no_momento}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificacoesBell;
