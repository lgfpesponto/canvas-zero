import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  registerPriceChangeHandler,
  type PriceChangeTarget,
  type PriceChangeResult,
} from '@/lib/priceChangeGuard';

type Escopo = 'desde_inicio' | 'data_especifica' | 'futuro';
type Modo = 'congelar' | 'recalcular';

interface PendingState {
  target: PriceChangeTarget;
  resolve: (r: PriceChangeResult | null) => void;
}

/**
 * Componente global. Monte UMA vez no App (admin areas).
 * Mantém o handler do guard registrado enquanto montado.
 */
export default function PriceChangeDialog() {
  const [pending, setPending] = useState<PendingState | null>(null);
  const [escopo, setEscopo] = useState<Escopo>('desde_inicio');
  const [modo, setModo] = useState<Modo>('congelar');
  const [dataEspecifica, setDataEspecifica] = useState<string>('');
  const [aplicarEm, setAplicarEm] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const pendingRef = useRef<PendingState | null>(null);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    registerPriceChangeHandler((target) => {
      return new Promise<PriceChangeResult | null>((resolve) => {
        // Reset state
        setEscopo('desde_inicio');
        setModo('congelar');
        setDataEspecifica('');
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        setAplicarEm(tomorrow.toISOString().slice(0, 10));
        setObservacao('');
        setSaving(false);
        setPending({ target, resolve });
      });
    });
    return () => registerPriceChangeHandler(null);
  }, []);

  const close = (result: PriceChangeResult | null) => {
    const p = pendingRef.current;
    if (p) p.resolve(result);
    setPending(null);
  };

  const onCancel = () => close(null);

  const onConfirm = async () => {
    if (!pending) return;
    const { target } = pending;

    let data_corte: string | null = null;
    let aplicar_em: string | null = null;

    if (escopo === 'data_especifica') {
      if (!dataEspecifica) {
        toast.error('Informe a data de corte');
        return;
      }
      data_corte = new Date(dataEspecifica + 'T00:00:00').toISOString();
    } else if (escopo === 'futuro') {
      if (!aplicarEm) {
        toast.error('Informe a data futura');
        return;
      }
      const dt = new Date(aplicarEm + 'T00:00:00');
      if (dt.getTime() <= Date.now()) {
        toast.error('A data futura precisa ser depois de hoje');
        return;
      }
      aplicar_em = dt.toISOString();
    }

    // Confirmação extra para modo recalcular (afeta financeiro/relatórios)
    if (modo === 'recalcular' && escopo !== 'futuro') {
      const ok = window.confirm(
        'Modo RECALCULAR: o valor dos pedidos antigos elegíveis será alterado no banco ' +
        '(preco += Δ × quantidade) e isso afeta relatórios, comissão e financeiro. ' +
        'Tem certeza que quer continuar?'
      );
      if (!ok) return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('aplicar_mudanca_preco', {
        _tipo: target.tipo,
        _target_id: target.target_id,
        _preco_depois: target.preco_depois,
        _escopo: escopo,
        _data_corte: data_corte,
        _aplicar_em: aplicar_em,
        _observacao: observacao || null,
        _modo: modo,
      });
      if (error) throw error;
      const result = data as any as PriceChangeResult;
      if (escopo === 'futuro') {
        toast.success(`Mudança agendada para ${new Date(aplicar_em!).toLocaleDateString('pt-BR')}`);
      } else if (modo === 'recalcular') {
        toast.success(`Preço atualizado. ${result?.pedidos_ajustados || 0} pedido(s) RECALCULADO(s) com o novo valor.`);
      } else {
        toast.success(`Preço atualizado. ${result?.pedidos_ajustados || 0} pedido(s) congelado(s) no valor antigo.`);
      }
      close(result);
    } catch (e: any) {
      console.error('aplicar_mudanca_preco', e);
      toast.error('Erro ao aplicar mudança: ' + (e?.message || e));
      setSaving(false);
    }
  };

  if (!pending) return null;
  const { target } = pending;
  const delta = Number(target.preco_depois) - Number(target.preco_antes);
  const sentido = delta > 0 ? 'aumento' : 'desconto';

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !saving) onCancel(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mudança de preço detectada</DialogTitle>
          <DialogDescription>
            Você está alterando o preço de <strong>{target.label}</strong>.
            Escolha a partir de quando essa mudança vale.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-2 text-sm bg-muted rounded p-3">
            <div>
              <div className="text-muted-foreground text-xs">Antes</div>
              <div className="font-medium">R$ {Number(target.preco_antes).toFixed(2).replace('.', ',')}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Depois</div>
              <div className="font-medium">R$ {Number(target.preco_depois).toFixed(2).replace('.', ',')}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Diferença</div>
              <div className={`font-semibold ${delta > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {delta > 0 ? '+' : ''}R$ {delta.toFixed(2).replace('.', ',')} ({sentido})
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-2 block">Vale a partir de:</Label>
            <RadioGroup value={escopo} onValueChange={(v) => setEscopo(v as Escopo)} className="space-y-2">
              <div className="flex items-start gap-2">
                <RadioGroupItem value="desde_inicio" id="esc-inicio" className="mt-1" />
                <Label htmlFor="esc-inicio" className="font-normal cursor-pointer flex-1">
                  <strong>Desde o início do portal</strong>
                  <div className="text-xs text-muted-foreground">
                    Todos os pedidos anteriores ficam congelados no preço atual.
                    Só pedidos novos a partir de agora usam o preço novo.
                  </div>
                </Label>
              </div>

              <div className="flex items-start gap-2">
                <RadioGroupItem value="data_especifica" id="esc-data" className="mt-1" />
                <Label htmlFor="esc-data" className="font-normal cursor-pointer flex-1">
                  <strong>A partir de uma data específica</strong>
                  <div className="text-xs text-muted-foreground mb-1">
                    Pedidos criados ANTES dessa data ficam congelados no preço atual.
                  </div>
                  {escopo === 'data_especifica' && (
                    <Input
                      type="date"
                      value={dataEspecifica}
                      onChange={(e) => setDataEspecifica(e.target.value)}
                      className="h-8 w-44"
                    />
                  )}
                </Label>
              </div>

              <div className="flex items-start gap-2">
                <RadioGroupItem value="futuro" id="esc-futuro" className="mt-1" />
                <Label htmlFor="esc-futuro" className="font-normal cursor-pointer flex-1">
                  <strong>Só a partir de uma data futura</strong>
                  <div className="text-xs text-muted-foreground mb-1">
                    O preço só muda na data marcada. Até lá ninguém é afetado.
                  </div>
                  {escopo === 'futuro' && (
                    <Input
                      type="date"
                      value={aplicarEm}
                      onChange={(e) => setAplicarEm(e.target.value)}
                      className="h-8 w-44"
                      min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                    />
                  )}
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-xs">Observação (opcional)</Label>
            <Textarea
              rows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex.: Reajuste anual de custos"
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar e ajustar pedidos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
