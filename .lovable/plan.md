## Objetivo

Hoje, ao mover um pedido para uma etapa anterior na lista de Meus Pedidos, o sistema **já abre direto o campo de justificativa**. Você quer um passo intermediário de **confirmação humana** que mostre quando o pedido entrou na etapa atual, antes de exigir a justificativa.

## Fluxo novo (2 passos)

1. **Confirmação** — modal "Tem certeza?":
   > Pedido **#7E-XXXX0001** está em **Pesponto 02** desde **12/04/2026 às 14:30**.
   > Você quer voltá-lo para **Corte**?
   > [Cancelar] [Sim, voltar etapa]

2. **Se Sim** → segue o modal atual de justificativa (mínimo 5 caracteres, registrada como `[RETROCESSO]` no histórico). Nada muda no resto.

Se houver vários pedidos selecionados em retrocesso, a confirmação lista todos com a respectiva data/hora da última entrada na etapa atual.

## Detalhes técnicos

**Arquivo único alterado:** `src/pages/ReportsPage.tsx`

1. Em `handleBulkProgressUpdate`, quando detectar regressões:
   - Para cada pedido em retrocesso, ler `historico` (jsonb já existente) e achar a **última** entrada cujo `local === ord.status` (a etapa atual).
   - Pegar `data` + `hora` desse evento. Fallback: `data_criacao` + `hora_criacao` se não houver registro.
   - Em vez de abrir direto o modal de justificativa, abrir um novo modal `showRegressionConfirmModal`.

2. Novo estado:
   ```ts
   const [showRegressionConfirmModal, setShowRegressionConfirmModal] = useState(false);
   // regressionItems já existe — estender o tipo para incluir { desdeData, desdeHora }
   ```

3. Novo modal (Dialog) com:
   - Lista compacta: `#numero — Pesponto 02 → Corte (desde 12/04 14:30)`
   - Botões: **Cancelar** / **Sim, voltar etapa** (laranja)
   - Ao confirmar → fecha esse modal e abre o `showRegressionModal` atual (justificativa).

4. Não mexer em: `statusRegression.ts`, RPCs, RLS, histórico, ou qualquer outro fluxo. A justificativa continua obrigatória (mínimo 5 caracteres) e gravada como `[RETROCESSO]`.

## Defaults assumidos

- **Data exibida**: última entrada na etapa atual + hora (mais preciso quando há idas e voltas).
- **Escopo**: vale para qualquer regressão de etapa (mesmo critério já usado pela função `isStatusRegression`).

## Fora do escopo

- Mudança individual de status na página de detalhes (não existe hoje — tudo passa pelo seletor em massa de Meus Pedidos).
- Alterar a função `isStatusRegression` ou a ordem canônica de status.
- Alterar o registro no histórico (continua igual).