## Objetivo

Quando o usuário clicar em **OK** no modal "Mudar Progresso de Produção" (e em qualquer outro modal de mudança em massa de etapa, incluindo o de justificativa), substituir o botão por um **spinner com contador "X de Y processados"** que avança em tempo real à medida que cada pedido é atualizado. Bloqueia clique duplo, fechar o modal por backdrop/Esc e manter a transparência do que está acontecendo.

## Onde mexer

Arquivo único: `src/pages/ReportsPage.tsx`.

### 1. Novo estado de progresso
```ts
const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
```
- `null` → idle (botão normal "OK").
- `{current, total}` → em andamento (botão vira spinner + "X / Y").

### 2. Atualizar `handleBulkProgressUpdate` (linhas 440-512)
Substituir o loop `for` que itera `normals` por uma versão que:
1. Antes de começar: `setBulkProgress({ current: 0, total: normals.length })`.
2. A cada `await updateOrderStatus(...)` bem ou mal sucedido: incrementa `current` (`setBulkProgress(p => p ? { ...p, current: p.current + 1 } : p)`).
3. Ao terminar a fase de "normais": se `regressions.length === 0`, zera `setBulkProgress(null)` no `finally`. Se houver regressions, mantém ativo (o próximo passo é o modal de justificativa, que terá seu próprio total).

### 3. Atualizar `handleConfirmRegression` (linhas 514-539)
Mesma lógica:
- `setBulkProgress({ current: 0, total: regressionItems.length })` no início.
- Incrementar a cada iteração.
- Limpar (`null`) no final, dentro de `try/finally`.

### 4. Botão OK (linhas 1370-1379)
Trocar o conteúdo do botão por:
```tsx
<button
  onClick={handleBulkProgressUpdate}
  disabled={!!bulkProgress || (selectedProgress === 'Cancelado' && !progressObservacao.trim())}
  className="..."
>
  {bulkProgress ? (
    <span className="inline-flex items-center gap-2">
      <Loader2 className="animate-spin" size={14} />
      {bulkProgress.current} / {bulkProgress.total}
    </span>
  ) : 'OK'}
</button>
```
Botão "Cancelar" também ganha `disabled={!!bulkProgress}`.
Diálogo: trocar `onOpenChange={setShowProgressModal}` por `onOpenChange={(o) => { if (!bulkProgress) setShowProgressModal(o); }}` (impede fechar enquanto roda).

### 5. Modal de justificativa (regressão / pausa / cancelamento)
Aplicar o mesmo tratamento no botão "Confirmar" desse modal (perto de `handleConfirmRegression`): mostrar `Loader2` + `current / total` enquanto `bulkProgress` está ativo, e desabilitar Cancelar/onOpenChange.

### 6. Import
Garantir que `Loader2` está importado de `lucide-react` (provavelmente já está; se não, adicionar).

## O que NÃO muda

- Lógica de transição/justificativa/`updateOrderStatus`.
- Toasts de sucesso/erro existentes.
- Diálogo `BulkBlockedDialog`.

## Detalhe de implementação

O loop hoje é sequencial (`for ... await`) — perfeito para mostrar progresso real pedido-a-pedido. Não vamos paralelizar (manter ordem e fácil contagem). Performance idêntica à atual; a única diferença é que o usuário enxerga o avanço em vez de só ver o botão "travado".

## Memória

Ao final, anotar em `mem://features/orders/bulk-progress-feedback` que toda mudança em massa de etapa exibe spinner + contador no botão de confirmação durante a execução.
