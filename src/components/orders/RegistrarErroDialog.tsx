import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, formatBrasiliaDate, formatBrasiliaTime } from '@/contexts/AuthContext';
import type { Order } from '@/contexts/AuthContext';
import { orderToDbRow } from '@/lib/order-logic';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: Order;
}

/** Retorna um número ERRO livre: <n>ERRO, <n>ERRO2, <n>ERRO3, ... */
async function nextFreeErroNumero(base: string): Promise<string> {
  const candidates = [`${base}ERRO`];
  for (let i = 2; i <= 20; i++) candidates.push(`${base}ERRO${i}`);
  const { data } = await supabase
    .from('orders')
    .select('numero')
    .in('numero', candidates);
  const taken = new Set((data || []).map((r: any) => r.numero));
  return candidates.find(n => !taken.has(n)) || `${base}ERRO${Date.now()}`;
}

export function RegistrarErroDialog({ open, onOpenChange, order }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [numeroErro, setNumeroErro] = useState<string>('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDescricao('');
    setLoading(true);
    nextFreeErroNumero(order.numero).then(n => {
      setNumeroErro(n);
      setLoading(false);
    });
  }, [open, order.numero]);

  const handleSubmit = async () => {
    const desc = descricao.trim();
    if (!desc) { toast.error('Descreva o erro antes de continuar.'); return; }
    if (!numeroErro) return;
    setSaving(true);
    try {
      // Buscar linha completa do original para copiar todos os campos.
      const { data: originalRow, error: fetchErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order.id)
        .maybeSingle();
      if (fetchErr || !originalRow) {
        toast.error('Não foi possível ler o pedido original.');
        setSaving(false);
        return;
      }

      const dataHoje = formatBrasiliaDate(new Date());
      const horaAgora = formatBrasiliaTime(new Date());
      const usuarioNome = user?.nomeCompleto || user?.email || 'usuário';

      // Clona a linha do banco tal qual, sobrescreve os campos do ERRO.
      const payload: any = { ...originalRow };
      // Deixa Postgres gerar novo id/created_at/updated_at.
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;

      payload.numero = numeroErro;
      payload.preco = 0;
      payload.quantidade = 1;
      payload.status = 'Em aberto';
      payload.data_criacao = dataHoje;
      payload.hora_criacao = horaAgora;
      payload.dias_restantes = originalRow.dias_restantes ?? 10;
      payload.historico = [{
        data: dataHoje,
        hora: horaAgora,
        local: 'Em aberto',
        descricao: `Pedido ERRO registrado a partir de #${order.numero}: ${desc}`,
        usuario: usuarioNome,
      }];
      payload.alteracoes = [];
      payload.impressoes = [];
      payload.conferido = false;
      payload.conferido_em = null;
      payload.conferido_por = null;
      payload.desconto = null;
      payload.desconto_justificativa = null;
      payload.adicional_valor = null;
      payload.adicional_desc = null;
      payload.preco_congelado = false;
      payload.estoque_baixado = false;
      payload.erro_de_pedido_id = order.id;
      payload.erro_descricao = desc;
      // Mantém user_id como quem está criando (dono do pedido ERRO)
      if (user?.id) payload.user_id = user.id;

      const { data: inserted, error: insErr } = await supabase
        .from('orders')
        .insert(payload)
        .select('id')
        .single();

      if (insErr || !inserted) {
        toast.error('Falha ao registrar erro: ' + (insErr?.message || 'erro desconhecido'));
        setSaving(false);
        return;
      }

      toast.success(`Pedido ERRO ${numeroErro} criado.`);
      onOpenChange(false);
      navigate(`/pedido/${inserted.id}`);
    } finally {
      setSaving(false);
    }
    // orderToDbRow é importado para manter compatibilidade caso futuras
    // migrações mudem o schema — não usado diretamente aqui.
    void orderToDbRow;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle size={18} /> Registrar Erro
          </DialogTitle>
          <DialogDescription>
            Cria um pedido de erro (valor zerado) vinculado ao pedido #{order.numero}.
            Ele passará pelo mesmo fluxo de produção do original.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Número do pedido ERRO</Label>
            <Input value={loading ? 'Gerando…' : numeroErro} readOnly className="mt-1 font-mono font-bold" />
          </div>
          <div>
            <Label htmlFor="erro-desc" className="text-xs uppercase text-muted-foreground">
              Descrição do erro *
            </Label>
            <Textarea
              id="erro-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o que aconteceu de errado neste pedido…"
              className="mt-1 min-h-[120px]"
              autoFocus
              disabled={saving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={saving || loading || !descricao.trim()}
          >
            {saving ? (<><Loader2 size={14} className="animate-spin mr-2" /> Salvando…</>) : 'Passar erro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
