## Problema

Ao aplicar acréscimo (ou desconto) no detalhe do pedido:
1. UI mostra "Acréscimo aplicado com sucesso!"
2. Mas o banco NÃO é alterado — `desconto` continua `NULL`, `preco` continua igual, `alteracoes` continua vazio.

### Causa raiz (confirmada nos logs)

O console mostra três vezes:
```
PGRST204: Could not find the 'precoMigradoV2' column of 'orders' in the schema cache
```

O botão "Aplicar Acréscimo" em `OrderDetailPage.tsx` chama:
```ts
updateOrder(order.id, { desconto, preco, descontoJustificativa, precoMigradoV2: true }, ...)
```

Dentro de `updateOrder` (AuthContext) cada campo vira `dbKey = CAMEL_TO_SNAKE[key] || key`. O mapa `CAMEL_TO_SNAKE` em `src/lib/order-logic.ts` NÃO inclui `precoMigradoV2` nem `precoRegraVersao` — então a chave camelCase vai pro banco, o Postgres rejeita o UPDATE inteiro (não só esse campo), e nada é salvo.

Pior: `updateOrder` só faz `console.error` e retorna, sem propagar erro. O `await updateOrder(...)` resolve normalmente, então o código segue chamando `toast.success(...)`. Por isso parece que funcionou.

## Correção

### 1. `src/lib/order-logic.ts`
Adicionar no `CAMEL_TO_SNAKE`:
```ts
precoMigradoV2: 'preco_migrado_v2',
precoRegraVersao: 'preco_regra_versao',
```

Isso já faz o save voltar a funcionar imediatamente (acréscimo/desconto + qualquer outro caller que mande esses campos).

### 2. `src/contexts/AuthContext.tsx` — propagar falha
Mudar a assinatura de `updateOrder` para retornar `{ ok: boolean; error?: string }` (ou lançar) em vez de só logar. Assim o callsite consegue mostrar `toast.error` quando falhar, em vez de mentir um success.

### 3. `src/pages/OrderDetailPage.tsx` — usar o retorno
No `onClick` do "Aplicar Desconto/Acréscimo", checar o retorno e só mostrar `toast.success` + limpar form se foi `ok`. Senão, `toast.error("Falha ao aplicar: ...")`.

### 4. Stamp `preco_regra_versao` no save manual
Aproveitando a arquitetura nova de versionamento, no mesmo patch passar `precoRegraVersao: <versão atual>` (via `getCurrentPrecoRegraVersao()` de `src/lib/precoRegraVersao.ts`). Isso evita que o edge function `reconciliar-precos` reprocesse o pedido depois e — para `bota_pronta_entrega` especificamente — sobrescreva o `preco` recém-salvo (porque o `computeTotalToSave` no edge faz `preco - desconto`, o que duplicaria o ajuste).

## Verificação

- Aplicar acréscimo de R$ 5 no pedido `17780888964204` (Denise / florencia / R$ 310).
- Esperado: Total passa para R$ 315; aparece linha "Acréscimo + R$ 5,00"; entra registro em `alteracoes` com a justificativa; banco salva `preco=315`, `desconto=-5`, `preco_regra_versao = versão atual`.
- Refresh da página: valor permanece R$ 315 (não volta).

## Arquivos tocados

- `src/lib/order-logic.ts` — 2 linhas no map
- `src/contexts/AuthContext.tsx` — retornar erro de `updateOrder`
- `src/pages/OrderDetailPage.tsx` — tratar retorno + stamp `precoRegraVersao`

Sem migração de banco — colunas já existem.