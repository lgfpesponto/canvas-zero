import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  canSync: boolean;
}

const MAX_CICLOS = 40;

/**
 * Botão "Resincronizar Bagy" — reenvia o saldo atual de estoque de TODOS os
 * produtos ativos para a Bagy, garantindo que a quantidade lá fique igual à do
 * portal. Não altera nada no portal (preços, produtos ou vínculos).
 */
const BagyResyncAllButton = ({ canSync }: Props) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [rediscover, setRediscover] = useState(false);
  const [progresso, setProgresso] = useState({ feitos: 0, total: 0 });

  if (!canSync) return null;

  const run = async () => {
    setRunning(true);
    setProgresso({ feitos: 0, total: 0 });

    let ok = 0;
    let fail = 0;
    const naoEncontrados: string[] = [];

    try {
      let restantes = 0;
      let total = 0;

      for (let ciclo = 0; ciclo < MAX_CICLOS; ciclo++) {
        const body =
          ciclo === 0
            ? { force_all_active: true, force_rediscover: rediscover }
            : {};

        const { data, error } = await supabase.functions.invoke('bagy-stock-sync', { body });
        if (error) throw error;

        const payload = data as {
          results?: { sku?: string; ok?: boolean; error?: string }[];
          pendentes_restantes?: number;
          em_execucao?: boolean;
        };

        if (payload?.em_execucao) {
          toast.info('Já existe uma sincronização em andamento. Aguarde alguns instantes.');
          break;
        }

        const results = payload?.results || [];
        for (const r of results) {
          if (r.ok) ok++;
          else {
            fail++;
            if (r.error === 'sku_nao_encontrado_na_bagy' && r.sku) naoEncontrados.push(r.sku);
          }
        }

        restantes = payload?.pendentes_restantes ?? 0;
        if (ciclo === 0) total = results.length + restantes;

        setProgresso({ feitos: ok + fail, total: Math.max(total, ok + fail) });

        if (results.length === 0 || restantes === 0) break;
      }

      const processados = ok + fail;
      if (processados === 0) {
        toast.info('Nenhum produto pendente de sincronização.');
      } else if (fail === 0) {
        toast.success(`Estoque confirmado na Bagy para ${ok} SKU.`);
      } else {
        toast.warning(
          `Estoque atualizado em ${ok} SKU. ${fail} com problema` +
            (naoEncontrados.length
              ? ` (${naoEncontrados.length} não cadastrado(s) na Bagy).`
              : '.'),
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro na resincronização.';
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)} disabled={running}>
        {running ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
        {running ? 'Sincronizando...' : 'Resincronizar Bagy'}
      </Button>

      {running && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-5 py-4 shadow-lg">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="text-sm">
              <p className="font-semibold">Atualizando estoque na Bagy...</p>
              {progresso.total > 0 && (
                <p className="text-muted-foreground">
                  {progresso.feitos} de {progresso.total} SKU
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reatualizar o estoque na Bagy?</AlertDialogTitle>
            <AlertDialogDescription>
              O saldo atual de todos os produtos ativos será reenviado para a Bagy, para garantir
              que a quantidade de lá fique igual à do portal. Nada é alterado aqui no portal.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <label className="flex items-start gap-2 rounded-md border border-border p-3 text-sm">
            <Checkbox
              checked={rediscover}
              onCheckedChange={(v) => setRediscover(v === true)}
              className="mt-0.5"
            />
            <span>
              Redescobrir vínculos na Bagy
              <span className="block text-xs text-muted-foreground">
                Só marque se os produtos foram recriados na Bagy — deixa a sincronização bem mais
                lenta.
              </span>
            </span>
          </label>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={run}>Reatualizar estoque</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BagyResyncAllButton;
