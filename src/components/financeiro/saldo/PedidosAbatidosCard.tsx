import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/order-logic';
import { LoadingValue } from '@/components/ui/LoadingValue';
import {
  fetchBaixasTodas, type RevendedorBaixa,
} from '@/lib/revendedorSaldo';
import { supabase } from '@/integrations/supabase/client';
import { PedidosAbatidosListaDialog } from './PedidosAbatidosListaDialog';

export type PeriodoAbat = 'hoje' | '7d' | 'mes' | 'mes_anterior' | 'todos';

interface Props {
  vendedoresOptions: string[];
}

export const PedidosAbatidosCard = ({ vendedoresOptions }: Props) => {
  const [baixas, setBaixas] = useState<RevendedorBaixa[]>([]);
  const [orderNumeros, setOrderNumeros] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<PeriodoAbat>('mes');
  const [vendedor, setVendedor] = useState<string>('todos');
  const [listaOpen, setListaOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const b = await fetchBaixasTodas();
      setBaixas(b);
      const ids = Array.from(new Set(b.map(x => x.order_id).filter(Boolean)));
      if (ids.length > 0) {
        const map: Record<string, string> = {};
        // chunked to avoid URL too long
        const chunkSize = 200;
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          const { data } = await supabase
            .from('orders')
            .select('id, numero')
            .in('id', chunk);
          (data || []).forEach((o: any) => { map[o.id] = o.numero; });
        }
        setOrderNumeros(map);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const periodoStart = useMemo<Date | null>(() => {
    const now = new Date();
    if (periodo === 'hoje') {
      const d = new Date(now); d.setHours(0, 0, 0, 0); return d;
    }
    if (periodo === '7d') {
      const d = new Date(now); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d;
    }
    if (periodo === 'mes') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (periodo === 'mes_anterior') return new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return null;
  }, [periodo]);

  const periodoEnd = useMemo<Date | null>(() => {
    if (periodo === 'mes_anterior') {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return null;
  }, [periodo]);

  const filtradas = useMemo(() => {
    return baixas.filter(b => {
      if (vendedor !== 'todos' && b.vendedor !== vendedor) return false;
      if (periodoStart && new Date(b.created_at) < periodoStart) return false;
      if (periodoEnd && new Date(b.created_at) >= periodoEnd) return false;
      return true;
    });
  }, [baixas, vendedor, periodoStart, periodoEnd]);

  const total = filtradas.reduce((s, b) => s + Number(b.valor_pedido || 0), 0);

  return (
    <>
      <Card className="border-primary/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-primary">
            <CheckCircle2 size={16} /> Pedidos abatidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline gap-3 flex-wrap">
            <p className="text-2xl font-bold text-primary">
              <LoadingValue loading={loading} hasData={true} size={20}>
                {filtradas.length}
              </LoadingValue>
              <span className="text-sm font-normal text-muted-foreground ml-1">pedidos</span>
            </p>
            <p className="text-base font-semibold">
              {formatCurrency(total)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Período</Label>
              <Select value={periodo} onValueChange={(v: any) => setPeriodo(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="mes">Este mês</SelectItem>
                  <SelectItem value="mes_anterior">Mês anterior</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px]">Vendedor</Label>
              <Select value={vendedor} onValueChange={setVendedor}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[260px]">
                  <SelectItem value="todos">Todos</SelectItem>
                  {vendedoresOptions.map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => setListaOpen(true)}
            disabled={filtradas.length === 0}
          >
            <Eye size={14} /> Ver lista
          </Button>
        </CardContent>
      </Card>

      <PedidosAbatidosListaDialog
        open={listaOpen}
        onOpenChange={setListaOpen}
        baixas={filtradas}
        orderNumeros={orderNumeros}
      />
    </>
  );
};
