import { Link } from 'react-router-dom';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download } from 'lucide-react';
import { formatCurrency } from '@/lib/order-logic';
import { formatDateBR } from '@/components/financeiro/financeiroHelpers';
import type { RevendedorBaixa } from '@/lib/revendedorSaldo';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  baixas: RevendedorBaixa[];
  orderNumeros: Record<string, string>;
}

export const PedidosAbatidosListaDialog = ({ open, onOpenChange, baixas, orderNumeros }: Props) => {
  const total = baixas.reduce((s, b) => s + Number(b.valor_pedido || 0), 0);

  const exportCSV = () => {
    const header = ['Data', 'Pedido', 'Vendedor', 'Valor'];
    const rows = baixas.map(b => [
      formatDateBR(b.created_at.slice(0, 10)),
      orderNumeros[b.order_id] || b.order_id,
      b.vendedor,
      Number(b.valor_pedido || 0).toFixed(2).replace('.', ','),
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos-abatidos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Pedidos abatidos — {baixas.length} pedido(s) · {formatCurrency(total)}
          </DialogTitle>
        </DialogHeader>

        {baixas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum pedido abatido no filtro selecionado.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baixas.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="text-xs">{formatDateBR(b.created_at.slice(0, 10))}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {orderNumeros[b.order_id] ? (
                      <Link
                        to={`/pedido/${b.order_id}`}
                        className="text-primary underline font-medium"
                      >
                        Pedido #{orderNumeros[b.order_id]}
                      </Link>
                    ) : (
                      <span>{b.order_id.slice(0, 8)}…</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{b.vendedor}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(b.valor_pedido))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={baixas.length === 0}>
            <Download size={14} /> Exportar CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
