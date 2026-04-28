# Mostrar spinner enquanto o pedido está sendo carregado

## Problema

Quando você abre o detalhe de um pedido (ex.: bota), os dados precisam ser buscados no banco. Hoje, enquanto a busca acontece, a tela mostra a mensagem **"Pedido não encontrado"** — porque o código verifica só `if (!order)` e não considera que o carregamento ainda está em andamento. Só depois de uns segundos o pedido aparece.

Isso dá a sensação de que está demorando muito, e em alguns casos a pessoa pensa que o pedido nem existe.

## Correção

Em `src/pages/OrderDetailPage.tsx`, antes do bloco que mostra "Pedido não encontrado", adicionar uma verificação de carregamento:

- Se `orderLoading === true` → mostrar um spinner centralizado com o texto "Carregando pedido..."
- Se `orderLoading === false` E `order === null` → aí sim mostrar "Pedido não encontrado"
- Se o pedido carregou → renderiza a tela normalmente

O hook `useOrderById` já expõe o estado `loading` (linha 37 já desestrutura como `orderLoading`), então é só usar.

### Visual

```
        ⟳  (spinner girando, cor primária)
   Carregando pedido...
```

Usa o ícone `Loader2` do lucide-react que já está importado.

## Arquivos afetados

- `src/pages/OrderDetailPage.tsx` — substituir o bloco `if (!order)` (linhas ~72-78) por dois blocos: um de loading e um de "não encontrado".
