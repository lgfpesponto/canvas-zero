## Problema

Ao abrir o snapshot de Cobrança da Maria Gabriela (19/05, 1.016 pedidos), a modal mostra "Sem pedidos" e dispara o toast **"Erro ao carregar pedidos: Bad Request"**.

Causa: o código faz uma única chamada `supabase.from('orders').in('id', order_ids)` com os 1.016 UUIDs concatenados na URL. Isso ultrapassa o limite de tamanho de URL do PostgREST e a requisição volta 400. O mesmo problema afeta a regeração do PDF.

## Correção

Em `src/components/gestao/HistoricoPdfTab.tsx`, criar um helper local `fetchOrdersByIds(ids, columns)` que:

1. Divide o array de IDs em lotes de **200** (margem segura abaixo do limite de URL).
2. Faz `Promise.all` dos `.in('id', batch)` paralelos.
3. Concatena os resultados e retorna como um array único.
4. Se algum lote falhar, propaga o erro original.

Substituir as três chamadas atuais por esse helper:

- **linha 139-144** (`openDetalhes`) → lista da modal de detalhes
- **linha 158-162** (`abrirRegerar`) → preview do regerar (valor atual)
- **linha 186-188** (regeração efetiva do PDF)

## Por que 200 e não 1000

O limite real do PostgREST varia (~8 KB por URL). Cada UUID + vírgula custa ~37 caracteres. 200 IDs ≈ 7,4 KB, ainda com folga para os outros parâmetros (`select=`, `id=in.(...)`). Mais que isso começa a arriscar.

## Validação

Após o ajuste, reabrir o snapshot do dia 19/05 da Maria Gabriela:
- A lista de 1.016 pedidos deve carregar (sem o toast de Bad Request).
- O botão "Regerar com preços atuais" deve mostrar o preview correto e gerar o PDF.

Sem alteração no esquema do banco nem na função RPC — é só client-side.

## Arquivos afetados

- `src/components/gestao/HistoricoPdfTab.tsx` (único arquivo)
