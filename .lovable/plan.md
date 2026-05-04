## Mudanças no Portal Bordado (`src/pages/BordadoPortalPage.tsx`)

### 1. Diálogo de justificativa ao retroceder Baixa → Entrada

- Reusar o componente existente `JustificativaDialog` (`src/components/JustificativaDialog.tsx`).
- Adicionar estado `pendingRetrocesso: Order | null`.
- O botão `RotateCcw` no card da coluna **Baixa Bordado 7Estrivos** passa a abrir o diálogo (não chama mais a RPC direto).
- Ao confirmar com motivo, chamar a RPC `bordado_baixar_pedido` enviando `_justificativa: motivo` (a função já exige justificativa para esse retrocesso e registra no histórico). Em sucesso, atualização otimista do card movendo de Baixa → Entrada.
- Cancelar fecha o diálogo sem alterar nada.
- Refatorar `aplicarStatus` para aceitar um parâmetro opcional `justificativa` e propagá-lo na RPC.

### 2. Card do pedido: mostrar data de criação + vendedor

No subcomponente `BordadoColumn`, substituir as duas linhas atuais (`modelo • tamanho` e `vendedor`) por uma única linha:

```
<numero negrito>
DD/MM/AAAA • <vendedor>
```

Formatar `o.dataCriacao` como `dd/MM/yyyy` (curto, sem hora) usando split simples da string ISO já presente no Order, mantendo padrão usado em outras telas.

### 3. Ordenação por data de criação (mais antiga → mais atual)

A query já ordena por `data_criacao asc, hora_criacao asc`. Garantir o mesmo comportamento nos `useMemo` `entrada` e `baixa` após filtros de busca (ordenação estável já vem do array pai, então não precisa reordenar; apenas confirmar que `filter` mantém a ordem).

### 4. Paginação por coluna

- Adicionar paginação independente para cada coluna (`Entrada` e `Baixa`), 20 itens por página (mesmo padrão da lista principal de pedidos).
- Estado: `pageEntrada` e `pageBaixa` (resetam para 1 quando o termo de busca muda).
- Na `BordadoColumn`, receber novas props `page`, `pageSize`, `onPageChange` e renderizar somente a fatia da página atual.
- Renderizar controle de paginação compacto abaixo da lista usando os componentes existentes em `src/components/ui/pagination.tsx` (Anterior / números / Próxima). Esconder se houver apenas 1 página.
- A rolagem interna (`max-h-[60vh] overflow-y-auto`) é mantida; a paginação corta antes de gerar excesso de itens.

### Arquivos tocados

- `src/pages/BordadoPortalPage.tsx` (única alteração)

Sem mudanças de banco, RPC ou em outras telas — a RPC `bordado_baixar_pedido` já aceita `_justificativa` e implementa a regra.
