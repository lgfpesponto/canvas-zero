/**
 * Helpers para envio de link de rastreio via WhatsApp (wa.me).
 * Tudo client-side, sem custo de API — abre o app/web do vendedor já
 * com a mensagem pronta.
 */

/** Remove tudo que não é dígito e normaliza para E.164 BR (55 + DDD + número). */
export function normalizePhoneBR(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  // Já tem o 55 na frente?
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits;
  // 10 (fixo) ou 11 (celular) → adiciona 55
  if (digits.length === 10 || digits.length === 11) return '55' + digits;
  // fallback — usa o que tiver
  return digits;
}

/** Aplica máscara visual (XX) XXXXX-XXXX enquanto o usuário digita. */
export function maskPhoneBR(raw: string): string {
  const d = (raw || '').replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Telefone "bonito" para colocar dentro da mensagem (ex: (11) 99999-8888). */
export function formatPhoneDisplay(raw: string | null | undefined): string {
  return maskPhoneBR(String(raw || '').replace(/^55/, '')) || (raw || '');
}

/** URL pública de rastreio do pedido. */
export function getPublicTrackingUrl(orderId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/rastreio/${orderId}`;
}

export interface TrackingMessageParams {
  cliente: string;
  numero: string;
  nomeLoja: string;
  link: string;
  telefoneLoja: string;
}

/** Monta a mensagem padrão de aviso ao cliente. */
export function buildTrackingMessage(p: TrackingMessageParams): string {
  const cliente = (p.cliente || '').trim() || 'cliente';
  const nomeLoja = (p.nomeLoja || '').trim() || '7 Estrivos';
  return (
    `Olá ${cliente}! Seu pedido ${p.numero} da loja ${nomeLoja} foi cadastrado. ` +
    `Acompanhe a produção em tempo real com esse link: ${p.link}`
  );
}


/** Monta a URL wa.me com telefone e mensagem (encode aplicado). */
export function buildWhatsappUrl(phoneRaw: string, message: string): string {
  const phone = normalizePhoneBR(phoneRaw);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
