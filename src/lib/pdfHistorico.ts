/**
 * Histórico de PDFs gerados no portal.
 *
 * Para qualquer PDF: grava um snapshot leve em `pdf_snapshots` com filtros,
 * lista de IDs e totais — permite reconstituir "o que entrou no PDF naquele
 * momento" mesmo que pedidos mudem depois.
 *
 * Para PDFs de Cobrança (tipo === 'cobranca'): faz upload do arquivo no
 * bucket `financeiro` em `pdf-historico/cobranca/{yyyy-mm-dd}/{id}.pdf` e
 * grava `storage_path` + `arquivo_kb` no snapshot.
 *
 * Fail-silent: nunca quebra o "Gerar PDF" do usuário.
 */
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

export type PdfHistTipo =
  | 'cobranca'
  | 'expedicao'
  | 'corte'
  | 'bordados'
  | 'metais'
  | 'forro'
  | 'forma'
  | 'palmilha'
  | 'pesponto'
  | 'escalacao'
  | 'extras_cintos'
  | 'comissao_bordado';

interface SnapshotInput {
  tipo: PdfHistTipo;
  filtros: Record<string, unknown>;
  orderIds: string[];
  totais: { qtd_pedidos?: number; qtd_produtos?: number; valor_total?: number };
  doc?: jsPDF;
  nomeArquivo?: string;
}

export async function registrarPdfSnapshot(args: SnapshotInput): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return;

    // Apenas admins têm RLS pra inserir; tenta direto, falha silenciosa se não puder.
    const id = (globalThis.crypto?.randomUUID?.() as string) || undefined;

    let storagePath: string | null = null;
    let arquivoKb: number | null = null;

    if (args.tipo === 'cobranca' && args.doc) {
      try {
        const blob = args.doc.output('blob') as Blob;
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const fileId = id || globalThis.crypto?.randomUUID?.() || String(Date.now());
        const path = `pdf-historico/cobranca/${yyyy}-${mm}-${dd}/${fileId}.pdf`;
        const up = await supabase.storage.from('financeiro').upload(path, blob, {
          contentType: 'application/pdf',
          upsert: false,
        });
        if (!up.error) {
          storagePath = path;
          arquivoKb = Math.round(blob.size / 1024);
        } else {
          console.warn('[pdfHistorico] upload falhou:', up.error);
        }
      } catch (e) {
        console.warn('[pdfHistorico] erro gerando blob:', e);
      }
    }

    const { data: prof } = await supabase
      .from('profiles')
      .select('nome_completo')
      .eq('id', userId)
      .maybeSingle();

    const payload: Record<string, unknown> = {
      tipo: args.tipo,
      gerado_por: userId,
      gerado_por_nome: prof?.nome_completo || null,
      filtros: args.filtros || {},
      order_ids: args.orderIds || [],
      totais: args.totais || {},
      storage_path: storagePath,
      arquivo_kb: arquivoKb,
      nome_arquivo: args.nomeArquivo || null,
    };
    if (id) payload.id = id;

    const { error } = await supabase.from('pdf_snapshots').insert(payload as any);
    if (error) console.warn('[pdfHistorico] insert falhou:', error);
  } catch (e) {
    console.warn('[pdfHistorico] erro inesperado:', e);
  }
}
