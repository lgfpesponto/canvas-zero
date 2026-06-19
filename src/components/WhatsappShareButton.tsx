import { useState } from 'react';
import { MessageCircle, Pencil } from 'lucide-react';
import { useAuth, type Order } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  buildTrackingMessage,
  buildWhatsappUrl,
  getPublicTrackingUrl,
  maskPhoneBR,
  normalizePhoneBR,
} from '@/lib/whatsappSend';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  order: Order;
}

/**
 * Botão verde para enviar o link de rastreio pelo WhatsApp do cliente (wa.me).
 * - Se o pedido não tem `clienteWhatsapp`, abre um diálogo para adicionar.
 * - Se tem, abre direto o WhatsApp Web/App com a mensagem pronta.
 */
export const WhatsappShareButton = ({ order }: Props) => {
  const { user, updateOrder } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchVendorLoja = async (): Promise<{ nomeLoja: string; telefoneLoja: string }> => {
    // Caso 1: o usuário logado É o vendedor do pedido → usa dados próprios
    if (user?.nomeCompleto && user.nomeCompleto === order.vendedor) {
      return { nomeLoja: user.nomeLoja || '', telefoneLoja: user.telefoneLoja || '' };
    }
    // Caso 2: admin enviando por outro vendedor → busca no banco
    const { data } = await supabase
      .from('profiles')
      .select('nome_loja, telefone_loja')
      .eq('nome_completo', order.vendedor)
      .maybeSingle();
    return {
      nomeLoja: (data as any)?.nome_loja || '',
      telefoneLoja: (data as any)?.telefone_loja || '',
    };
  };

  const openWhatsapp = async (phoneRaw: string) => {
    const loja = await fetchVendorLoja();
    const message = buildTrackingMessage({
      cliente: order.cliente || '',
      numero: order.numero,
      nomeLoja: loja.nomeLoja,
      link: getPublicTrackingUrl(order.id),
      telefoneLoja: loja.telefoneLoja,
    });
    const url = buildWhatsappUrl(phoneRaw, message);
    window.open(url, '_blank', 'noopener');
  };

  const hasPhone = !!((order as any).clienteWhatsapp);

  if (!hasPhone) {
    return (
      <>
        <button
          type="button"
          onClick={() => { setPhoneInput(''); setShowAdd(true); }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 transition-colors"
          title="Adicionar WhatsApp do cliente para enviar o link"
        >
          <MessageCircle size={13} /> WhatsApp
        </button>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar WhatsApp do cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Esse número será salvo no pedido e usado para enviar o link de acompanhamento.
              </p>
              <Input
                type="tel"
                autoFocus
                value={phoneInput}
                onChange={(e) => setPhoneInput(maskPhoneBR(e.target.value))}
                placeholder="(XX) XXXXX-XXXX"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
              <Button
                disabled={saving || normalizePhoneBR(phoneInput).length < 12}
                onClick={async () => {
                  setSaving(true);
                  const res = await updateOrder(order.id, { clienteWhatsapp: phoneInput } as any);
                  setSaving(false);
                  if (!res.ok) { toast.error('Não foi possível salvar'); return; }
                  setShowAdd(false);
                  toast.success('WhatsApp salvo');
                  openWhatsapp(phoneInput);
                }}
              >
                Salvar e abrir WhatsApp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openWhatsapp((order as any).clienteWhatsapp)}
      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
      title={`Enviar link no WhatsApp ${(order as any).clienteWhatsapp}`}
    >
      <MessageCircle size={13} /> Enviar WhatsApp
    </button>
  );
};
