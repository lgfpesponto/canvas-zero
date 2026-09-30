import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  MoreVertical, Pencil, Mail, MessageCircle, Eye, Ban, MoreHorizontal,
  FileEdit, FilePlus2, FileDown, Trash2, Loader2, Undo2,
} from 'lucide-react';
import { gerarDanfePdf } from '@/lib/fiscal/danfePdf';
import { getFiscalProvider } from '@/lib/fiscal/provider';
import { emitirComplementar, emitirDevolucao } from '@/lib/fiscal/nfeBagy';
import { BagyPedidoEditDialog } from './BagyPedidoEditDialog';

const brl = (v: number) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export interface BagyPedidoMin {
  id: string; numero_bagy: string; cliente_nome: string | null;
  cliente_email: string | null; cliente_whats: string | null; total: number | null;
}

type NotaRow = {
  id: string; numero: number; serie: number; status: string; chave_acesso: string | null;
  valor_total: number; valor_produtos: number; motivo_rejeicao: string | null;
  destinatario_snapshot: any; data_autorizacao: string | null; tipo_nota: string;
};

const STATUS_SELLO: Record<string, { label: string; cls: string }> = {
  autorizada: { label: 'NF-e AUTORIZADA', cls: 'bg-green-600 text-white' },
  cancelada: { label: 'NF-e CANCELADA', cls: 'bg-gray-500 text-white' },
  rejeitada: { label: 'NF-e REJEITADA', cls: 'bg-red-600 text-white' },
  erro: { label: 'NF-e ERRO', cls: 'bg-red-600 text-white' },
  processando: { label: 'NF-e PROCESSANDO', cls: 'bg-yellow-500 text-white' },
};

export function BagyNfeMenu({ pedido: pedidoProp, onGerarNfe, notaId, onChanged, hideSello }: {
  pedido?: BagyPedidoMin; onGerarNfe?: () => void; notaId?: string; onChanged?: () => void; hideSello?: boolean;
}) {
  const [nota, setNota] = useState<NotaRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [ccOpen, setCcOpen] = useState(false);
  const [complOpen, setComplOpen] = useState(false);
  const [excluirOpen, setExcluirOpen] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [correcao, setCorrecao] = useState('');
  const [complValor, setComplValor] = useState('');
  const [complDesc, setComplDesc] = useState('');
  const [devOpen, setDevOpen] = useState(false);
  const [devItens, setDevItens] = useState<any[]>([]);
  const [devQtd, setDevQtd] = useState<Record<string, number>>({});
  const [devMotivo, setDevMotivo] = useState('');

  const load = useCallback(async () => {
    let q = supabase
      .from('nfe_notas').select('id, numero, serie, status, chave_acesso, valor_total, valor_produtos, motivo_rejeicao, destinatario_snapshot, data_autorizacao, tipo_nota');
    q = notaId ? q.eq('id', notaId) : q.eq('bagy_pedido_id', pedidoProp?.id ?? '').eq('tipo_nota', 'normal');
    const { data } = await q.order('created_at', { ascending: false }).limit(1).maybeSingle();
    setNota((data as NotaRow | null) ?? null);
  }, [notaId, pedidoProp?.id]);
  const dSnap: any = nota?.destinatario_snapshot || {};
  const pedido: BagyPedidoMin = pedidoProp ?? {
    id: '', numero_bagy: '', cliente_nome: dSnap.nome ?? null, cliente_email: dSnap.email ?? null,
    cliente_whats: dSnap.telefone ?? null, total: nota?.valor_total ?? null,
  };
  useEffect(() => { load(); }, [load]);

  const autorizada = nota?.status === 'autorizada';
  const bloqueiaNova = nota?.status === 'autorizada' || nota?.status === 'processando';
  const excluivel = nota && !['autorizada', 'cancelada'].includes(nota.status);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); await load(); onChanged?.(); } catch (e: any) { toast.error(e.message || 'Falha na operação.'); }
    finally { setBusy(null); }
  };

  const enviarWhats = () => {
    const fone = (pedido.cliente_whats || '').replace(/\D/g, '');
    if (!fone) { toast.error('Cliente sem WhatsApp cadastrado.'); return; }
    const msg = nota?.chave_acesso
      ? `Olá ${pedido.cliente_nome || ''}! Sua NF-e nº ${nota.numero} ${pedido.numero_bagy ? `(pedido RC-${pedido.numero_bagy})` : ''} foi emitida. Chave: ${nota.chave_acesso}`
      : `Olá ${pedido.cliente_nome || ''}! Sobre seu pedido RC-${pedido.numero_bagy}.`;
    window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const enviarEmail = () => {
    if (!pedido.cliente_email) { toast.error('Cliente sem e-mail cadastrado.'); return; }
    const assunto = `NF-e ${nota ? `nº ${nota.numero} ` : ''}- Pedido RC-${pedido.numero_bagy}`;
    const corpo = nota?.chave_acesso
      ? `Olá ${pedido.cliente_nome || ''},\n\nSegue a sua Nota Fiscal Eletrônica nº ${nota.numero}, série ${nota.serie}.\nChave de acesso: ${nota.chave_acesso}\nValor total: ${brl(nota.valor_total)}\n\nConsulte a nota em https://www.nfe.fazenda.gov.br/portal/consulta.aspx usando a chave acima.\n\n7 Estrivos`
      : `Olá ${pedido.cliente_nome || ''},\n\nSobre seu pedido RC-${pedido.numero_bagy}.\n\n7 Estrivos`;
    window.open(`mailto:${pedido.cliente_email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`, '_self');
  };

  const espelhoNf = () => run('espelho', async () => {
    if (!nota) return;
    const { data: itens } = await supabase.from('nfe_itens').select('*').eq('nota_id', nota.id).order('ordem');
    const dest = nota.destinatario_snapshot || {};
    const doc = new jsPDF();
    let y = 14;
    doc.setFontSize(13); doc.text('ESPELHO DA NF-e — SEM VALOR FISCAL', 105, y, { align: 'center' }); y += 8;
    doc.setFontSize(10);
    doc.text(`NF-e nº ${nota.numero} / Série ${nota.serie} — Status: ${nota.status.toUpperCase()}`, 14, y); y += 6;
    if (nota.chave_acesso) { doc.setFontSize(8); doc.text(`Chave: ${nota.chave_acesso}`, 14, y); y += 5; doc.setFontSize(10); }
    doc.text(`Cliente: ${dest.nome || '—'}  CPF/CNPJ: ${dest.cpf_cnpj || '—'}`, 14, y); y += 6;
    doc.text(`${dest.logradouro || ''}, ${dest.numero || ''} - ${dest.bairro || ''} - ${dest.municipio || ''}/${dest.uf || ''} CEP ${dest.cep || ''}`, 14, y); y += 8;
    doc.setFontSize(9);
    (itens || []).forEach((it: any) => {
      const line = `${it.codigo}  ${it.descricao}  NCM ${it.ncm}  ${it.quantidade} ${it.unidade} x ${brl(it.valor_unitario)} = ${brl(it.valor_total)}`;
      doc.text(doc.splitTextToSize(line, 180), 14, y); y += doc.splitTextToSize(line, 180).length * 4 + 1;
    });
    y += 4; doc.setFontSize(11);
    doc.text(`Total da nota: ${brl(nota.valor_total)}`, 14, y);
    doc.save(`Espelho-NFe-${String(nota.numero).padStart(9, '0')}.pdf`);
  });

  const cancelar = () => run('cancelar', async () => {
    if (!nota) return;
    await getFiscalProvider().cancelar(nota.id, justificativa.trim());
    toast.success('NF-e cancelada na SEFAZ.');
    setCancelOpen(false); setJustificativa('');
  });

  const cartaCorrecao = () => run('cc', async () => {
    if (!nota) return;
    await getFiscalProvider().cartaCorrecao(nota.id, correcao.trim());
    toast.success('Carta de correção registrada na SEFAZ.');
    setCcOpen(false); setCorrecao('');
  });

  const complementar = () => run('compl', async () => {
    if (!nota) return;
    const valor = Number(complValor.replace(',', '.'));
    if (!valor || valor <= 0) { toast.error('Informe um valor válido.'); return; }
    const r = await emitirComplementar(nota.id, valor, complDesc.trim() || 'COMPLEMENTO DE VALOR');
    if (r.autorizada) toast.success(`NFe complementar nº ${r.numero} autorizada.`);
    else toast.error(`Complementar rejeitada: ${r.motivo}`);
    setComplOpen(false); setComplValor(''); setComplDesc('');
  });

  const abrirDevolucao = async () => {
    if (!nota) return;
    const { data } = await supabase.from('nfe_itens').select('*').eq('nota_id', nota.id).order('ordem');
    setDevItens(data || []);
    setDevQtd(Object.fromEntries((data || []).map((i: any) => [i.id, Number(i.quantidade)])));
    setDevOpen(true);
  };

  const devolucao = () => run('dev', async () => {
    if (!nota) return;
    const r = await emitirDevolucao(nota.id, devItens.map(i => ({ itemId: i.id, quantidade: devQtd[i.id] || 0 })), devMotivo.trim());
    if (r.autorizada) toast.success(`NF-e de devolução nº ${r.numero} autorizada.`);
    else toast.error(`Devolução rejeitada: ${r.motivo}`);
    setDevOpen(false); setDevMotivo('');
  });

  const devTotal = devItens.reduce((s, i) => s + (devQtd[i.id] || 0) * Number(i.valor_unitario), 0);

  const excluir = () => run('excluir', async () => {
    if (!nota) return;
    await supabase.from('nfe_itens').delete().eq('nota_id', nota.id);
    const { error } = await supabase.from('nfe_notas').delete().eq('id', nota.id);
    if (error) throw new Error(error.message);
    toast.success('Rascunho da nota excluído.');
    setExcluirOpen(false);
  });

  const sello = nota ? STATUS_SELLO[nota.status] : null;

  return (
    <span className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
      {!hideSello && sello && nota && (
        <span className={`text-[10px] font-bold px-2 py-1 rounded ${sello.cls}`}
          title={nota.motivo_rejeicao || undefined}>
          {sello.label}{nota.status === 'autorizada' ? ` nº ${nota.numero}` : ''}
        </span>
      )}
      {pedido.id && <BagyPedidoEditDialog pedidoId={pedido.id} open={editOpen} onOpenChange={setEditOpen} onSaved={onChanged} />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Ações da NF-e">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <MoreVertical size={16} />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {pedido.id && !autorizada && (<>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <FileEdit size={14} className="mr-2" /> Editar pedido
            </DropdownMenuItem>
          </>)}
          {onGerarNfe && !bloqueiaNova && (<>
            <DropdownMenuItem onClick={onGerarNfe}>
              <Pencil size={14} className="mr-2" /> Gerar NF-e
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>)}
          <DropdownMenuItem onClick={enviarEmail}><Mail size={14} className="mr-2" /> Enviar por e-mail</DropdownMenuItem>
          <DropdownMenuItem onClick={enviarWhats}><MessageCircle size={14} className="mr-2" /> Enviar por WhatsApp</DropdownMenuItem>
          <DropdownMenuItem disabled={!nota} onClick={espelhoNf}><Eye size={14} className="mr-2" /> Enviar espelho NF</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!autorizada} onClick={() => setCancelOpen(true)} className="text-destructive">
            <Ban size={14} className="mr-2" /> Cancelar NF-e
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger><MoreHorizontal size={14} className="mr-2" /> Outras opções de NF-e</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem disabled={!autorizada} onClick={() => setCcOpen(true)}>
                <FileEdit size={14} className="mr-2" /> Carta de correção
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!autorizada} onClick={() => setComplOpen(true)}>
                <FilePlus2 size={14} className="mr-2" /> NFe complementar
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem disabled={!autorizada} onClick={() => run('danfe', async () => { await gerarDanfePdf(nota!.id, 'a4', 'save'); })}>
            <FileDown size={14} className="mr-2" /> Gerar PDF DANFE
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!autorizada} onClick={abrirDevolucao}>
            <Undo2 size={14} className="mr-2" /> Gerar devolução
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!excluivel} onClick={() => setExcluirOpen(true)} className="text-destructive">
            <Trash2 size={14} className="mr-2" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Cancelar NF-e */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar NF-e nº {nota?.numero}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">O cancelamento é registrado na SEFAZ e não pode ser desfeito. Justificativa obrigatória (mínimo 15 caracteres).</p>
          <Textarea value={justificativa} onChange={e => setJustificativa(e.target.value)} placeholder="Motivo do cancelamento..." rows={3} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Voltar</Button>
            <Button variant="destructive" disabled={justificativa.trim().length < 15 || busy === 'cancelar'} onClick={cancelar}>
              {busy === 'cancelar' && <Loader2 size={14} className="mr-1 animate-spin" />} Confirmar cancelamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Carta de correção */}
      <Dialog open={ccOpen} onOpenChange={setCcOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Carta de correção — NF-e nº {nota?.numero}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">A carta de correção não pode alterar valores, impostos ou dados que mudem o destinatário/remetente.</p>
          <Textarea value={correcao} onChange={e => setCorrecao(e.target.value)} placeholder="Texto da correção..." rows={4} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCcOpen(false)}>Voltar</Button>
            <Button disabled={correcao.trim().length < 15 || busy === 'cc'} onClick={cartaCorrecao}>
              {busy === 'cc' && <Loader2 size={14} className="mr-1 animate-spin" />} Enviar à SEFAZ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* NFe complementar */}
      <Dialog open={complOpen} onOpenChange={setComplOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>NFe complementar — NF-e nº {nota?.numero}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Emite uma nota complementar vinculada, para acrescentar valor à nota original.</p>
          <div className="space-y-2">
            <label className="text-xs font-semibold">Valor a complementar (R$) *</label>
            <Input value={complValor} onChange={e => setComplValor(e.target.value)} placeholder="Ex: 50,00" inputMode="decimal" />
            <label className="text-xs font-semibold">Descrição</label>
            <Input value={complDesc} onChange={e => setComplDesc(e.target.value)} placeholder="COMPLEMENTO DE VALOR" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setComplOpen(false)}>Voltar</Button>
            <Button disabled={!Number(complValor.replace(',', '.')) || busy === 'compl'} onClick={complementar}>
              {busy === 'compl' && <Loader2 size={14} className="mr-1 animate-spin" />} Emitir complementar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Devolução */}
      <Dialog open={devOpen} onOpenChange={setDevOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Gerar devolução — NF-e nº {nota?.numero}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Emite uma nota de entrada vinculada à nota original. Ajuste a quantidade de cada item devolvido (0 = não devolve).</p>
          <div className="space-y-2 max-h-64 overflow-auto">
            {devItens.map(i => (
              <div key={i.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{i.descricao} <span className="text-muted-foreground">({brl(Number(i.valor_unitario))} · vendido {Number(i.quantidade)})</span></span>
                <Input type="number" min={0} max={Number(i.quantidade)} className="w-20 h-8"
                  value={devQtd[i.id] ?? 0}
                  onChange={e => setDevQtd(q => ({ ...q, [i.id]: Math.max(0, Math.min(Number(i.quantidade), Number(e.target.value) || 0)) }))} />
              </div>
            ))}
          </div>
          <div className="text-sm font-semibold">Total da devolução: {brl(devTotal)}</div>
          <label className="text-xs font-semibold">Motivo da devolução *</label>
          <Textarea value={devMotivo} onChange={e => setDevMotivo(e.target.value)} rows={2} placeholder="Ex: troca de tamanho, produto com defeito..." />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDevOpen(false)}>Voltar</Button>
            <Button disabled={devTotal <= 0 || devMotivo.trim().length < 5 || busy === 'dev'} onClick={devolucao}>
              {busy === 'dev' && <Loader2 size={14} className="mr-1 animate-spin" />} Emitir devolução
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Excluir rascunho */}
      <AlertDialog open={excluirOpen} onOpenChange={setExcluirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir rascunho da NF-e?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove a nota nº {nota?.numero} (situação: {nota?.status}) do portal. Notas autorizadas não podem ser excluídas — apenas canceladas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={excluir} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </span>
  );
}
