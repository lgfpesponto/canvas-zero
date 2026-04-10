
## O que está acontecendo

Eu conferi o código atual e o banco, e o problema real é este:

1. O sistema hoje já busca corretamente o barcode novo em hex do UUID:
   - `src/hooks/useOrders.ts` já está com `.ilike('id', \`%-${suffix}\`)`

2. Mas a busca de barcode legado ainda está errada:
   - hoje ela faz:
   ```ts
   const realNumero = digits.replace(/^0+/, '');
   .eq('numero', realNumero)
   ```
   - isso só funciona se o pedido salvo no banco for puramente numérico

3. No banco existem muitos pedidos alfanuméricos:
   - encontrei 146 pedidos com `numero` contendo letras
   - exemplos reais: `E0033715`, `E0033602`, `SBC-1`

4. Isso explica exatamente o que você está vendo:
   - uma ficha antiga pode codificar `0000033715`
   - o scanner joga esse valor no campo
   - esse número parece “não ter nada a ver” com `E0033715`, mas na verdade ele vem do barcode legado
   - o sistema então procura `numero = '33715'`
   - como no banco o pedido está salvo como `E0033715`, ele não encontra

## Conclusão

O erro não é mais só do UUID/hex.
O problema restante é a compatibilidade com fichas antigas já impressas, principalmente pedidos com letras no número.

Ou seja:
- pedidos novos com barcode hex: a correção do UUID resolve
- fichas antigas com código legado numérico: ainda falham em pedidos alfanuméricos

## Como eu resolveria

### 1) Corrigir a busca legada em `src/hooks/useOrders.ts`
Trocar a lógica atual de `eq('numero', realNumero)` por uma busca de candidatos + validação real do barcode legado.

Abordagem:
- importar `orderBarcodeValueLegacy` de `AuthContext`
- quando o código escaneado tiver 10 dígitos:
  - buscar candidatos por `numero` contendo os dígitos relevantes
  - validar em memória com `orderBarcodeValueLegacy(o.numero) === trimmed`

Exemplo da lógica:
```ts
const digits = trimmed.replace(/\D/g, '');
if (digits.length === 10) {
  const realNumero = digits.replace(/^0+/, '');
  if (realNumero) {
    const { data: candidates } = await supabase
      .from('orders')
      .select('*')
      .ilike('numero', `%${realNumero}%`);

    const match = candidates?.find(o => orderBarcodeValueLegacy(o.numero) === trimmed);
    if (match) return dbRowToOrder(match);
  }
}
```

### 2) Manter a busca hex como está
Essa parte deve continuar:
```ts
.ilike('id', `%-${suffix}`)
```
Ela cobre os barcodes novos/reimpressos baseados no UUID.

### 3) Melhorar a mensagem da tela do scanner
Para evitar confusão, eu também ajustaria o texto para deixar claro que:
- o campo mostra o código lido pelo scanner
- ele não precisa ser igual ao número visual do pedido

Exemplo:
- “Código lido: 0000033715”
- “Pedido encontrado: E0033715”

## Resultado esperado

Depois dessa correção:
- fichas antigas já impressas continuam funcionando
- pedidos com número alfanumérico passam a ser encontrados
- pedidos novos com barcode hex continuam funcionando
- não precisa reimprimir as fichas

## Arquivos envolvidos

| Arquivo | Mudança |
|---|---|
| `src/hooks/useOrders.ts` | corrigir a busca legada para alfanuméricos |
| `src/pages/ReportsPage.tsx` | opcional: melhorar feedback visual do scanner |
| `src/pages/OrderDetailPage.tsx` | opcional: melhorar feedback visual do scanner |

## Detalhe técnico importante

Hoje o sistema está em um estado “meio corrigido”:
- a parte do UUID foi ajustada
- a parte dos códigos legados antigos não foi concluída

Por isso você ainda vê “pedido não encontrado” mesmo quando o scanner preenche algo no campo.

## Validação que eu faria depois de implementar

1. testar uma ficha antiga de pedido como `E0033715`
2. confirmar que o scanner lê algo como `0000033715`
3. verificar se o sistema abre o pedido `E0033715`
4. testar também uma ficha nova com barcode UUID/hex
5. confirmar o fluxo inteiro de ponta a ponta no scanner real
