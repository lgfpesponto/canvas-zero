/**
 * Bloco "Prazo de Produção" — usado nos formulários de bota e cinto.
 * Lê `ficha_tipos.lead_time_dias` do slug corrente e exibe em dias úteis.
 * Em modo edição (admin_master) vira um input editável cujo valor fica
 * como draft em `FichaEditContext.pendingLeadTime` e só é persistido
 * quando o admin clica "salvar versão" na barra flutuante.
 */
import { useFichaEdit } from '@/contexts/FichaEditContext';
import { useFichaTipoBySlug } from '@/hooks/useAdminConfig';

export function PrazoProducaoBox({ slug, fallback = 20 }: { slug: string; fallback?: number }) {
  const { editMode, isAdmin, pendingLeadTime, setPendingLeadTime } = useFichaEdit();
  const { data: tipo } = useFichaTipoBySlug(slug);
  const salvo = (tipo as any)?.lead_time_dias ?? fallback;
  const atual = pendingLeadTime ?? salvo;
  const edited = editMode && pendingLeadTime !== null && pendingLeadTime !== salvo;
  const podeEditar = editMode && isAdmin;

  return (
    <div className="bg-muted rounded-lg p-3 space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold">Prazo de Produção:</span>
        {podeEditar ? (
          <>
            <input
              type="number"
              min={1}
              value={atual}
              onChange={e => {
                const n = parseInt(e.target.value, 10);
                setPendingLeadTime(Number.isFinite(n) && n > 0 ? n : null);
              }}
              className="w-20 h-8 rounded border border-input bg-background px-2 text-sm"
            />
            <span className="text-sm">dias úteis</span>
          </>
        ) : (
          <span className="text-sm">{atual} dias úteis</span>
        )}
        {edited && (
          <span className="text-[11px] font-medium text-amber-600 bg-amber-500/10 rounded px-2 py-0.5">
            editado — salve a versão para aplicar
          </span>
        )}
      </div>
      {podeEditar && (
        <p className="text-[11px] text-muted-foreground">
          Aplica somente a pedidos criados a partir da nova versão da ficha.
        </p>
      )}
    </div>
  );
}
