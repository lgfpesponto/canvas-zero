
Descobri o motivo exato de no preview ainda falhar.

O erro não é mais “o scanner lê errado”. O scanner está lendo um código hex de 12 caracteres (`D9169F23EAF1`), mas a busca atual tenta fazer isso no Supabase:

```ts
.ilike('id', `%-${suffix}`)
```

Só que `id` é do tipo `uuid`, e o Postgres não aceita `ILIKE` direto em `uuid`. A prova está no log de rede do preview:

```text
operator does not exist: uuid ~~* unknown
```

Por isso o sistema sempre cai em “Pedido não encontrado”, mesmo quando o código existe.

O que vou implementar:

1. Corrigir a busca por barcode UUID/hex em `src/hooks/useOrders.ts`
   - remover a estratégia com `.ilike('id', ...)`
   - substituir por uma abordagem compatível com UUID, por exemplo:
     - buscar candidatos recentes e validar com `orderBarcodeValue(...)`, ou
     - preferencialmente criar uma função SQL/RPC no Supabase que faça `id::text` no banco e retorne o pedido certo

2. Manter a compatibilidade com fichas antigas
   - preservar a lógica legada de 10 dígitos
   - continuar validando pedidos alfanuméricos com `orderBarcodeValueLegacy`

3. Melhorar a robustez do scanner
   - normalizar entrada (`trim`, case-insensitive para hex)
   - tratar explicitamente os formatos:
     - número do pedido
     - UUID completo
     - hex de 12 caracteres
     - legado de 10 dígitos

4. Validar nas duas telas que usam scanner
   - `src/pages/ReportsPage.tsx`
   - `src/pages/OrderDetailPage.tsx`

5. Teste que vou fazer depois da correção
   - escanear um código hex como `D9169F23EAF1`
   - confirmar que abre/seleciona o pedido correto
   - testar também um código legado de 10 dígitos
   - confirmar que não precisa reimprimir fichas

Detalhe técnico:
- o problema atual não está no barcode em si
- está na consulta Supabase feita contra a coluna `id` como `uuid`
- enquanto essa consulta usar `ILIKE` em `uuid`, o preview continuará falhando

Arquivos envolvidos:
- `src/hooks/useOrders.ts`
- possivelmente uma migration Supabase para criar uma função de busca por sufixo do UUID
- `src/pages/ReportsPage.tsx`
- `src/pages/OrderDetailPage.tsx`
