
## Objetivo

1. Permitir à Juliana (`admin_master`) **regularizar o histórico** quitando pedidos cobrados antigos (que já foram pagos fora do sistema) **sem mexer no saldo**.
2. Permitir descartar comprovantes pendentes **antigos** que já foram conferidos fora do sistema (sem aprovar nem creditar saldo).
3. Garantir que comprovantes lançados pela Juliana em nome do revendedor apareçam **em tempo real** no painel "Meu Saldo" desse revendedor.

---

## 1. Banco — duas novas RPCs (admin_master)

### `quitar_pedidos_historico(_order_ids uuid[], _motivo text)`
- Valida `has_role(auth.uid(), 'admin_master')`.
- Para cada pedido:
  - Pula se já tem registro em `revendedor_baixas_pedido` (idempotente).
  - Cria movimento em `revendedor_saldo_movimentos` com **tipo `ajuste_admin`**, `valor = preco × quantidade`, `saldo_anterior = saldo_posterior` (não mexe no saldo) e descrição `"[QUITAÇÃO HISTÓRICA] " || _motivo`.
  - Insere em `revendedor_baixas_pedido` (`order_id`, `vendedor`, `valor_pedido`, `movimento_id`).
- Retorna `jsonb` com `quitados`, `pulados`.
- Motivo é obrigatório (auditoria).

### `descartar_comprovantes_historico(_ids uuid[], _motivo text)`
- Valida `admin_master`.
- Atualiza cada comprovante pendente para `status = 'reprovado'`, `motivo_reprovacao = "[DESCARTE HISTÓRICO] " || _motivo`, `aprovado_por = auth.uid()`, `aprovado_em = now()`.
- Não cria movimento, não credita saldo, não espelha em A Receber.
- Retorna `jsonb` com `descartados`.

Ambas com `SECURITY DEFINER` e `SET search_path = public`, seguindo o padrão das outras RPCs do módulo.

---

## 2. Frontend — Quitação histórica de pedidos cobrados

**Arquivo: `src/components/financeiro/saldo/DetalhesRevendedorDrawer.tsx`**

Na seção **"Pedidos cobrados pendentes (FIFO)"**:
- Adicionar coluna de checkbox por linha (somente admin_master).
- Header com checkbox "selecionar todos" + botão **"Marcar como já quitado (histórico)"** que abre AlertDialog.
- AlertDialog explica que essa ação **não mexe no saldo** e exige um motivo (textarea obrigatório, ex.: "Pago antes da implantação do sistema").
- Ao confirmar → chama `quitar_pedidos_historico` com os ids selecionados → `reload()` + `onChanged()`.
- Toast com quantidade quitada.

Adicionar wrapper na lib `src/lib/revendedorSaldo.ts`:
```ts
export async function quitarPedidosHistorico(orderIds: string[], motivo: string)
export async function descartarComprovantesHistorico(ids: string[], motivo: string)
```

---

## 3. Frontend — Descarte de comprovantes pendentes antigos

**Arquivo: `src/components/financeiro/saldo/ComprovantesRevendedorPendentes.tsx`**

- Adicionar coluna de checkbox por linha + checkbox no header.
- Quando há ≥ 1 selecionado, exibir barra de ação no topo do card com:
  - Texto "N selecionado(s)"
  - Botão **"Descartar como histórico"** (variant outline) → abre AlertDialog com textarea de motivo obrigatório.
- AlertDialog deixa claro: "Use somente para comprovantes antigos que já foram conferidos fora do sistema. Não credita saldo nem cria lançamento em A Receber."
- Ao confirmar → chama `descartarComprovantesHistorico` → recarrega via realtime + `onChanged?.()`.
- Os botões de Aprovar/Reprovar individuais continuam funcionando normalmente.

---

## 4. Realtime no painel "Meu Saldo" do revendedor

**Arquivo: `src/pages/RevendedorSaldoPage.tsx`**

- Adicionar `useEffect` que assina canal Supabase Realtime em `revendedor_comprovantes` filtrado pelo `vendedorName` atual:
  ```ts
  supabase.channel(`revendedor_meu_saldo_${vendedorName}`)
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'revendedor_comprovantes', filter: `vendedor=eq.${vendedorName}` },
        () => scheduleReload())
  ```
- Também assina `revendedor_saldo_movimentos` (mesmo filtro) — assim, quando a Juliana aprova, o saldo e o card "A pagar" também se atualizam ao vivo.
- Debounce de ~400ms (mesmo padrão usado em `ComprovantesRevendedorPendentes`).
- A tabela `revendedor_comprovantes` já está no realtime publication (migração anterior). Vamos **adicionar `revendedor_saldo_movimentos`** ao publication na mesma migração desta tarefa.

---

## 5. Migração SQL (resumo)

```sql
-- 1. Habilita realtime em saldo_movimentos
ALTER TABLE public.revendedor_saldo_movimentos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.revendedor_saldo_movimentos;

-- 2. RPC: quitar pedidos históricos (sem mexer no saldo)
CREATE OR REPLACE FUNCTION public.quitar_pedidos_historico(_order_ids uuid[], _motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ ... $$;

-- 3. RPC: descartar comprovantes pendentes históricos
CREATE OR REPLACE FUNCTION public.descartar_comprovantes_historico(_ids uuid[], _motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ ... $$;
```

---

## Arquivos editados

- **Migração SQL nova** (RPCs + realtime publication)
- `src/lib/revendedorSaldo.ts` (2 novos wrappers)
- `src/components/financeiro/saldo/DetalhesRevendedorDrawer.tsx` (seleção + ação de quitação histórica)
- `src/components/financeiro/saldo/ComprovantesRevendedorPendentes.tsx` (seleção + descarte em massa)
- `src/pages/RevendedorSaldoPage.tsx` (realtime sync)

## Comportamentos preservados

- Aprovação normal de comprovantes continua creditando saldo + espelhando em A Receber + disparando FIFO.
- Reprovação individual com motivo continua existindo (descarte é um atalho em massa).
- RLS / permissões: todas as ações novas exigem `admin_master`.
