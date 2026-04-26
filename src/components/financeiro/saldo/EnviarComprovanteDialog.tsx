import { useState } from 'react';
import { Loader2, Upload, FileText, X, Building2, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  validateComprovante, fileHash, todayISO, formatDateBR,
} from '@/components/financeiro/financeiroHelpers';
import { uploadComprovanteRevendedor } from '@/lib/revendedorSaldo';
import { formatCurrency } from '@/lib/order-logic';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendedor: string;
  onSaved: () => void;
}

type ItemStatus = 'processing' | 'ready' | 'error' | 'saving' | 'saved';

interface ExtractedItem {
  id: string;
  file: File;
  hash: string;
  status: ItemStatus;
  error?: string;
  // Dados extraídos pela IA
  data_pagamento: string;
  valor: number;
  pagador_nome: string;
  pagador_documento: string;
  tipo_detectado: 'empresa' | 'fornecedor';
  observacao: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const EnviarComprovanteDialog = ({ open, onOpenChange, vendedor, onSaved }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [savingAll, setSavingAll] = useState(false);

  const reset = () => setItems([]);

  const close = () => {
    if (savingAll) return;
    reset();
    onOpenChange(false);
  };

  const processFile = async (item: ExtractedItem) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing', error: undefined } : i));
    try {
      const base64 = await fileToBase64(item.file);
      const mimeType = item.file.type ||
        (item.file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      const { data, error } = await supabase.functions.invoke('extract-comprovante', {
        body: { fileBase64: base64, fileName: item.file.name, mimeType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i,
        status: 'ready',
        data_pagamento: data.data_pagamento || todayISO(),
        valor: Number(data.valor) || 0,
        pagador_nome: data.destinatario_nome_original || data.destinatario || '',
        pagador_documento: data.destinatario_documento || '',
        tipo_detectado: (data.tipo === 'empresa' ? 'empresa' : 'fornecedor') as 'empresa' | 'fornecedor',
      } : i));
    } catch (e: any) {
      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i, status: 'error', error: e.message || 'Falha ao extrair',
      } : i));
    }
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: ExtractedItem[] = [];
    const existingHashes = new Set(items.map(i => i.hash));

    for (const file of Array.from(files)) {
      const verr = validateComprovante(file);
      if (verr) {
        toast({ title: `${file.name}: ${verr}`, variant: 'destructive' });
        continue;
      }
      const hash = await fileHash(file);
      if (existingHashes.has(hash) || newItems.some(n => n.hash === hash)) {
        toast({ title: `${file.name}: já adicionado nesta sessão`, variant: 'destructive' });
        continue;
      }
      newItems.push({
        id: crypto.randomUUID(),
        file,
        hash,
        status: 'processing',
        data_pagamento: todayISO(),
        valor: 0,
        pagador_nome: '',
        pagador_documento: '',
        tipo_detectado: 'fornecedor',
        observacao: '',
      });
    }
    if (newItems.length === 0) return;
    setItems(prev => [...prev, ...newItems]);

    // Processa em lotes de 3 pra não sobrecarregar
    for (let i = 0; i < newItems.length; i += 3) {
      const batch = newItems.slice(i, i + 3);
      await Promise.all(batch.map(processFile));
    }
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateObservacao = (id: string, observacao: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, observacao } : i));
  };

  const handleSendAll = async () => {
    if (savingAll) return;
    const ready = items.filter(i => i.status === 'ready');
    if (ready.length === 0) {
      toast({ title: 'Nenhum comprovante pronto pra enviar', variant: 'destructive' });
      return;
    }
    // Validação mínima dos dados extraídos
    for (const it of ready) {
      if (!it.valor || it.valor <= 0) {
        toast({
          title: `Não foi possível ler o valor de ${it.file.name}`,
          description: 'Tente um anexo mais nítido ou um PDF original.',
          variant: 'destructive',
        });
        return;
      }
      if (!it.data_pagamento) {
        toast({
          title: `Não foi possível ler a data de ${it.file.name}`,
          variant: 'destructive',
        });
        return;
      }
    }

    setSavingAll(true);
    let okCount = 0;
    const savedIds: string[] = [];

    for (const it of ready) {
      setItems(prev => prev.map(i => i.id === it.id ? { ...i, status: 'saving' } : i));
      try {
        // Checa duplicata por hash dentro do mesmo vendedor
        const { data: dup } = await supabase
          .from('revendedor_comprovantes' as any)
          .select('id')
          .eq('vendedor', vendedor)
          .eq('comprovante_hash', it.hash)
          .limit(1);
        if (dup && dup.length > 0) {
          throw new Error('Esse comprovante já foi enviado anteriormente.');
        }

        const path = await uploadComprovanteRevendedor(it.file);
        const { error } = await supabase.from('revendedor_comprovantes' as any).insert({
          vendedor,
          valor: it.valor,
          data_pagamento: it.data_pagamento,
          observacao: it.observacao.trim() || null,
          comprovante_url: path,
          comprovante_hash: it.hash,
          enviado_por: user?.id,
          status: 'pendente',
          pagador_nome: it.pagador_nome || null,
          pagador_documento: it.pagador_documento || null,
          tipo_detectado: it.tipo_detectado,
        });
        if (error) throw error;
        savedIds.push(it.id);
        okCount++;
      } catch (e: any) {
        setItems(prev => prev.map(i => i.id === it.id ? {
          ...i, status: 'error', error: e.message,
        } : i));
      }
    }
    setSavingAll(false);

    if (okCount > 0) {
      toast({
        title: `${okCount} comprovante(s) enviado(s)!`,
        description: 'A administração vai conferir e aprovar.',
      });
      const remaining = items.filter(i => !savedIds.includes(i.id));
      setItems(remaining);
      if (remaining.length === 0) {
        onOpenChange(false);
      }
      onSaved();
    }
  };

  const readyCount = items.filter(i => i.status === 'ready').length;
  const processingCount = items.filter(i => i.status === 'processing').length;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar comprovante(s) de pagamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm bg-muted rounded p-3">
            Anexe um ou mais comprovantes (PDF ou foto). O sistema lê automaticamente
            <strong> data, valor e quem recebeu</strong>. A administração confere antes de aprovar.
          </div>

          <div>
            <Label>Comprovantes (PDF ou foto — pode anexar vários)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center mt-1">
              <Upload className="mx-auto mb-2 text-muted-foreground" size={28} />
              <Input
                type="file"
                accept="application/pdf,image/*"
                multiple
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="cursor-pointer"
                disabled={savingAll}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Aceita PDF, JPG, PNG ou foto. Tamanho máximo: 10MB cada.
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">
                Comprovantes ({items.length})
                {processingCount > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {processingCount} sendo lido(s)...
                  </span>
                )}
              </h4>
              {items.map((it) => (
                <Card key={it.id} className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText size={16} className="shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium truncate">{it.file.name}</span>
                      {it.status === 'processing' && (
                        <span className="flex items-center gap-1 text-xs text-primary shrink-0">
                          <Loader2 size={12} className="animate-spin" /> Lendo...
                        </span>
                      )}
                      {it.status === 'ready' && <Badge variant="default" className="shrink-0">Pronto</Badge>}
                      {it.status === 'saving' && <Badge variant="secondary" className="shrink-0">Enviando...</Badge>}
                      {it.status === 'saved' && <Badge variant="default" className="shrink-0">Enviado</Badge>}
                      {it.status === 'error' && <Badge variant="destructive" className="shrink-0">Erro</Badge>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeItem(it.id)} disabled={it.status === 'saving'}>
                      <X size={14} />
                    </Button>
                  </div>

                  {it.status === 'error' && (
                    <div className="text-xs text-destructive mb-2">
                      {it.error}
                      <Button size="sm" variant="link" className="h-auto p-0 ml-2" onClick={() => processFile(it)}>
                        Tentar novamente
                      </Button>
                    </div>
                  )}

                  {(it.status === 'ready' || it.status === 'saving') && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-muted/50 rounded p-2">
                          <div className="text-xs text-muted-foreground">Data do pagamento</div>
                          <div className="font-semibold">{formatDateBR(it.data_pagamento)}</div>
                        </div>
                        <div className="bg-muted/50 rounded p-2">
                          <div className="text-xs text-muted-foreground">Valor</div>
                          <div className="font-semibold text-primary">{formatCurrency(it.valor)}</div>
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded p-2 text-sm">
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          {it.tipo_detectado === 'empresa' ? <Building2 size={12} /> : <User size={12} />}
                          Pago para
                        </div>
                        <div className="font-medium">
                          {it.tipo_detectado === 'empresa' ? (
                            <span className="text-primary">7Estrivos (Empresa)</span>
                          ) : (
                            <>{it.pagador_nome || 'Não identificado'}</>
                          )}
                        </div>
                        {it.pagador_documento && (
                          <div className="text-xs text-muted-foreground font-mono">{it.pagador_documento}</div>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">Observação (opcional)</Label>
                        <Textarea
                          rows={2} maxLength={500}
                          value={it.observacao}
                          onChange={(e) => updateObservacao(it.id, e.target.value)}
                          placeholder="Ex.: Pagamento referente aos pedidos de novembro"
                          disabled={it.status !== 'ready'}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={savingAll}>Cancelar</Button>
          <Button
            onClick={handleSendAll}
            disabled={savingAll || readyCount === 0 || processingCount > 0}
          >
            {savingAll ? (
              <><Loader2 size={14} className="animate-spin mr-1" /> Enviando...</>
            ) : (
              <><Upload size={14} className="mr-1" /> Enviar {readyCount} comprovante(s)</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
