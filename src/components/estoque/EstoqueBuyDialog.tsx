import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Package, X, Plus } from 'lucide-react';
import EstoqueFoto from './EstoqueFoto';
import SearchableSelect from '@/components/SearchableSelect';
import { TIPOS_COURO, getCoresCouroFiltradas } from '@/lib/orderFieldsConfig';
import {
  BOTA_PE_EXTRA_TYPES,
  BOTA_PE_EXTRA_LABEL,
  calcEmbeddedExtraPrice,
  type BotaPEExtra,
} from '@/lib/botaExtraHelpers';

interface EstoqueRow {
  id: string;
  nome: string;
  sku_base: string;
  tamanho: string;
  quantidade: number;
  preco: number;
  foto_url: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  produto: {
    nome: string;
    foto_url: string | null;
    preco: number;
    tamanhos: EstoqueRow[];
  } | null;
  onSuccess: () => void;
  vendedores?: string[];
}

interface ResumoItem {
  produto_id: string;
  tamanho: string;
  sku_base: string;
  preco_unit: number;
  extras: BotaPEExtra[];
}

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const EstoqueBuyDialog = ({ open, onClose, produto, onSuccess, vendedores = [] }: Props) => {
  const { user, isAdmin } = useAuth();
  // map produto_id -> quantidade desejada
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  // resumo: lista de itens (1 por unidade) com seus extras
  const [itens, setItens] = useState<ResumoItem[]>([]);
  const [vendedor, setVendedor] = useState('');
  const [cliente, setCliente] = useState('');
  const [whats, setWhats] = useState('');
  const [numero, setNumero] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && produto) {
      setQuantidades({});
      setItens([]);
      setVendedor(user?.nomeCompleto || '');
      setCliente('');
      setWhats('');
      setNumero('');
    }
  }, [open, produto, user]);

  // Reconciliar `itens` (1 por unidade) com `quantidades`, preservando extras já preenchidos
  useEffect(() => {
    if (!produto) return;
    setItens(prev => {
      const next: ResumoItem[] = [];
      // ordena por tamanho (numerico)
      const ordered = [...produto.tamanhos].sort((a, b) => Number(a.tamanho) - Number(b.tamanho));
      for (const t of ordered) {
        const qtd = quantidades[t.id] || 0;
        const existentes = prev.filter(i => i.produto_id === t.id);
        for (let k = 0; k < qtd; k++) {
          if (existentes[k]) {
            next.push({ ...existentes[k], preco_unit: t.preco, sku_base: t.sku_base, tamanho: t.tamanho });
          } else {
            next.push({
              produto_id: t.id,
              tamanho: t.tamanho,
              sku_base: t.sku_base,
              preco_unit: t.preco,
              extras: [],
            });
          }
        }
      }
      return next;
    });
  }, [quantidades, produto]);

  const total = useMemo(
    () => itens.reduce((s, it) => s + it.preco_unit + it.extras.reduce((a, e) => a + (e.preco || 0), 0), 0),
    [itens],
  );

  if (!produto) return null;

  const setQtd = (t: EstoqueRow, raw: string) => {
    const n = Math.max(0, parseInt(raw) || 0);
    if (n > t.quantidade) {
      toast.error(`Só temos ${t.quantidade} un. do tamanho ${t.tamanho}.`);
      setQuantidades(prev => ({ ...prev, [t.id]: t.quantidade }));
      return;
    }
    setQuantidades(prev => ({ ...prev, [t.id]: n }));
  };

  const updateItemExtra = (itemIdx: number, eIdx: number, newDados: Record<string, any>, recalc = false) => {
    setItens(prev => prev.map((it, i) => {
      if (i !== itemIdx) return it;
      return {
        ...it,
        extras: it.extras.map((ex, ei) => {
          if (ei !== eIdx) return ex;
          return { ...ex, dados: newDados, preco: recalc ? calcEmbeddedExtraPrice(ex.tipo, newDados) : ex.preco };
        }),
      };
    }));
  };

  const addItemExtra = (itemIdx: number, tipo: string) => {
    setItens(prev => prev.map((it, i) => {
      if (i !== itemIdx) return it;
      const novo: BotaPEExtra = { tipo, dados: {}, preco: calcEmbeddedExtraPrice(tipo, {}) };
      return { ...it, extras: [...it.extras, novo] };
    }));
  };

  const removeItemExtra = (itemIdx: number, eIdx: number) => {
    setItens(prev => prev.map((it, i) =>
      i !== itemIdx ? it : { ...it, extras: it.extras.filter((_, ei) => ei !== eIdx) }
    ));
  };

  const handleSubmit = async () => {
    if (!vendedor.trim()) { toast.error('Vendedor obrigatório.'); return; }
    if (!numero.trim()) { toast.error('Informe o nº do pedido.'); return; }
    if (itens.length === 0) { toast.error('Adicione ao menos uma unidade.'); return; }

    // Agrupa itens por produto_id, preservando ordem dos extras por unidade
    const grouped = new Map<string, { produto_id: string; quantidade: number; preco_unit: number; descricao: string; extras_por_unidade: any[][] }>();
    for (const it of itens) {
      const g = grouped.get(it.produto_id) ?? {
        produto_id: it.produto_id,
        quantidade: 0,
        preco_unit: it.preco_unit,
        descricao: produto.nome,
        extras_por_unidade: [],
      };
      g.quantidade += 1;
      g.extras_por_unidade.push(it.extras.map(e => ({ tipo: e.tipo, dados: e.dados, preco: e.preco })));
      grouped.set(it.produto_id, g);
    }
    const items = [...grouped.values()];

    setSubmitting(true);
    const { data, error } = await (supabase.rpc as any)('comprar_estoque', {
      _items: items,
      _vendedor: vendedor.trim(),
      _cliente: cliente.trim(),
      _whatsapp: whats.trim(),
      _numero_pedido: numero.trim(),
    });
    setSubmitting(false);

    if (error) {
      const msg = error.message || '';
      const m = msg.match(/ESTOQUE_INSUFICIENTE:([^:]+):([^:]+):(\d+)/);
      if (m) {
        toast.error(`Estoque esgotado para tam ${m[2]}. Restam ${m[3]}.`);
        return;
      }
      if (msg.includes('NUMERO_DUPLICADO')) {
        toast.error('Nº de pedido já existe. Use outro.');
        return;
      }
      toast.error(msg);
      return;
    }
    toast.success(`Pedido ${data?.numero} criado com sucesso!`);
    // Dispara sync de estoque com Bagy fire-and-forget
    Promise.all(
      [...new Set(items.map(item => item.produto_id))].map(produtoId =>
        supabase.functions.invoke('bagy-stock-sync', { body: { retry_produto_id: produtoId } })
      )
    ).catch(() => {});
    onSuccess();
    onClose();
  };

  const tamanhosOrdenados = [...produto.tamanhos].sort((a, b) => Number(a.tamanho) - Number(b.tamanho));

  const renderExtraFields = (item: ResumoItem, itemIdx: number, extra: BotaPEExtra, eIdx: number) => (
    <div key={eIdx} className="ml-2 p-2 border border-dashed border-border rounded space-y-2 relative bg-background">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">{BOTA_PE_EXTRA_LABEL[extra.tipo] || extra.tipo}</span>
        <button type="button" onClick={() => removeItemExtra(itemIdx, eIdx)} className="text-destructive hover:text-destructive/80">
          <X size={12} />
        </button>
      </div>

      {extra.tipo === 'tiras_laterais' && (
        <div>
          <Label className="text-[10px]">Cor das tiras *</Label>
          <Input className="h-7 text-xs" value={extra.dados.corTiras || ''} onChange={e => updateItemExtra(itemIdx, eIdx, { ...extra.dados, corTiras: e.target.value }, true)} placeholder="Ex: Marrom" />
        </div>
      )}

      {extra.tipo === 'carimbo_fogo' && (<>
        <div>
          <Label className="text-[10px]">Qtd. carimbos *</Label>
          <Select value={extra.dados.qtdCarimbos || '1'} onValueChange={v => updateItemExtra(itemIdx, eIdx, { ...extra.dados, qtdCarimbos: v }, true)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{[1,2,3,4,5,6].map(n => <SelectItem key={n} value={String(n)}>{n} {n >= 4 ? '(+R$ 20)' : ''}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px]">Descrição *</Label>
          <Textarea className="text-xs min-h-[50px]" value={extra.dados.descCarimbos || ''} onChange={e => updateItemExtra(itemIdx, eIdx, { ...extra.dados, descCarimbos: e.target.value })} placeholder="Descreva os carimbos" />
        </div>
        <div>
          <Label className="text-[10px]">Onde aplicado *</Label>
          <Input className="h-7 text-xs" value={extra.dados.ondeAplicado || ''} onChange={e => updateItemExtra(itemIdx, eIdx, { ...extra.dados, ondeAplicado: e.target.value })} placeholder="Ex: Cano direito" />
        </div>
      </>)}

      {(extra.tipo === 'kit_canivete' || extra.tipo === 'kit_faca') && (<>
        <div>
          <Label className="text-[10px]">Tipo de couro *</Label>
          <SearchableSelect options={TIPOS_COURO} value={extra.dados.tipoCouro || ''} onValueChange={v => updateItemExtra(itemIdx, eIdx, { ...extra.dados, tipoCouro: v })} placeholder="Selecione" />
        </div>
        <div>
          <Label className="text-[10px]">Cor do couro *</Label>
          <SearchableSelect options={getCoresCouroFiltradas(extra.dados.tipoCouro || '')} value={extra.dados.corCouro || ''} onValueChange={v => updateItemExtra(itemIdx, eIdx, { ...extra.dados, corCouro: v })} placeholder="Selecione" />
        </div>
        <div>
          <Label className="text-[10px]">Vai o canivete?</Label>
          <Select value={extra.dados.vaiCanivete || 'Não'} onValueChange={v => updateItemExtra(itemIdx, eIdx, { ...extra.dados, vaiCanivete: v }, true)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Sim">Sim (+R$ {extra.tipo === 'kit_canivete' ? '30' : '35'})</SelectItem>
              <SelectItem value="Não">Não</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </>)}

      {extra.tipo === 'adicionar_metais' && (<>
        <div className="space-y-1">
          <Label className="text-[10px]">Tipo do metal *</Label>
          {[{ label: 'Bola grande (R$ 0,60/un)', value: 'Bola grande' }, { label: 'Strass (R$ 0,60/un)', value: 'Strass' }].map(metal => (
            <div key={metal.value} className="flex items-center gap-2">
              <Checkbox
                checked={((extra.dados.metaisSelecionados || []) as string[]).includes(metal.value)}
                onCheckedChange={(checked) => {
                  const sel = (extra.dados.metaisSelecionados || []) as string[];
                  updateItemExtra(itemIdx, eIdx, { ...extra.dados, metaisSelecionados: checked ? [...sel, metal.value] : sel.filter(s => s !== metal.value) }, true);
                }}
              />
              <span className="text-xs">{metal.label}</span>
            </div>
          ))}
        </div>
        {((extra.dados.metaisSelecionados || []) as string[]).includes('Bola grande') && (
          <div>
            <Label className="text-[10px]">Qtd. bola grande *</Label>
            <Input className="h-7 text-xs" type="number" min="1" value={extra.dados.qtdBolaGrande || '1'} onChange={e => updateItemExtra(itemIdx, eIdx, { ...extra.dados, qtdBolaGrande: e.target.value }, true)} />
          </div>
        )}
        {((extra.dados.metaisSelecionados || []) as string[]).includes('Strass') && (
          <div>
            <Label className="text-[10px]">Qtd. strass *</Label>
            <Input className="h-7 text-xs" type="number" min="1" value={extra.dados.qtdStrass || '1'} onChange={e => updateItemExtra(itemIdx, eIdx, { ...extra.dados, qtdStrass: e.target.value }, true)} />
          </div>
        )}
      </>)}

      <p className="text-[10px] text-muted-foreground text-right">Valor: {fmtBRL(extra.preco)}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package size={18} /> Comprar do Estoque
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header produto */}
          <div className="flex gap-3 items-center bg-muted p-3 rounded-lg">
            <div className="w-16 h-16 rounded bg-background overflow-hidden flex items-center justify-center shrink-0">
              <EstoqueFoto url={produto.foto_url} alt={produto.nome} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm">{produto.nome}</h4>
              <p className="text-xs text-muted-foreground">Preço base: {fmtBRL(produto.preco)}</p>
            </div>
          </div>

          {/* Vendedor / cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Vendedor *</Label>
              {isAdmin && vendedores.length > 0 ? (
                <select
                  className="w-full h-9 px-2 rounded border border-border bg-background text-sm"
                  value={vendedor}
                  onChange={e => setVendedor(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {vendedores.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              ) : (
                <Input value={vendedor} onChange={e => setVendedor(e.target.value)} className="h-9 text-sm" disabled={!isAdmin} />
              )}
            </div>
            <div>
              <Label className="text-xs">Nº do pedido *</Label>
              <Input value={numero} onChange={e => setNumero(e.target.value)} placeholder="7E-AAAA0001" className="h-9 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs">Cliente</Label>
              <Input value={cliente} onChange={e => setCliente(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">WhatsApp</Label>
              <Input value={whats} onChange={e => setWhats(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          {/* Bloco A — Tamanhos e quantidades */}
          <div>
            <Label className="text-xs font-semibold">Tamanhos e quantidades *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
              {tamanhosOrdenados.map(t => {
                const esgotado = t.quantidade === 0;
                return (
                  <div key={t.id} className={`p-2 rounded border ${esgotado ? 'border-border bg-muted/30 opacity-60' : 'border-border bg-muted/40'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold">{t.tamanho}</span>
                      <span className="text-[10px] text-muted-foreground">{esgotado ? 'esgotado' : `${t.quantidade} disp.`}</span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={t.quantidade}
                      value={quantidades[t.id] ?? 0}
                      onChange={e => setQtd(t, e.target.value)}
                      disabled={esgotado}
                      className="h-8 text-sm text-center"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bloco B — Resumo do pedido */}
          {itens.length > 0 && (
            <div>
              <Label className="text-xs font-semibold">Resumo do pedido</Label>
              <div className="space-y-2 mt-2">
                {itens.map((it, idx) => {
                  const extrasSum = it.extras.reduce((s, e) => s + (e.preco || 0), 0);
                  const subtotal = it.preco_unit + extrasSum;
                  return (
                    <div key={idx} className="border border-border rounded-lg p-3 bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">Item {idx + 1}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {produto.nome} — Tam {it.tamanho} · 1 un.
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">Valor da ficha</p>
                          <p className="text-sm font-semibold">{fmtBRL(it.preco_unit)}</p>
                        </div>
                      </div>

                      {it.extras.map((ex, eIdx) => renderExtraFields(it, idx, ex, eIdx))}

                      <Select value="" onValueChange={(v) => addItemExtra(idx, v)}>
                        <SelectTrigger className="border-dashed h-8 text-xs">
                          <Plus size={12} className="mr-1" /><span>+ extra</span>
                        </SelectTrigger>
                        <SelectContent>
                          {BOTA_PE_EXTRA_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <div className="flex justify-between items-center pt-2 border-t border-border text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-bold text-primary">{fmtBRL(subtotal)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-center border-t pt-3">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold text-primary">{fmtBRL(total)}</span>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting || itens.length === 0} className="orange-gradient text-primary-foreground">
              {submitting ? 'Processando…' : 'Finalizar compra'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EstoqueBuyDialog;
