# Novo extra: Bainha de Celular

Criar produto `bainha_celular` idêntico ao `bainha_cartao` (campos Tipo de Couro + Cor do Couro), mas com preço **R$ 50,00**.

## Alterações

1. **`src/lib/extrasConfig.ts`** — adicionar entrada `bainha_celular` em `EXTRA_PRODUCTS` logo após `bainha_cartao`, com `precoBase: 50`, `precoLabel: 'R$ 50,00'`.
2. **`src/lib/orderDeadline.ts`** — adicionar `bainha_celular: 7` (mesmo prazo).
3. **`src/lib/recomputeOrderPrice.ts`** — adicionar `case 'bainha_celular': t += 50; break;`.
4. **`src/pages/ExtrasPage.tsx`**
   - preço padrão: `case 'bainha_celular': return 50;`
   - matriz de campos: `bainha_celular: ['tipoCouro', 'corCouro']`
   - render dos campos: incluir `productId === 'bainha_celular'` na mesma condição do `bainha_cartao`
5. **`src/pages/EditExtrasPage.tsx`** — mesmas 3 mudanças acima (preço 50, matriz de campos, render condicional).
6. **`src/pages/OrderDetailPage.tsx`**
   - soma de preço: `case 'bainha_celular': t += 50; break;`
   - breakdown do PDF: `case 'bainha_celular': extraPriceItems.push(['Bainha de Celular', 50]);`
7. **`src/components/SpecializedReports.tsx`** — adicionar `{ value: 'bainha_celular', label: 'Bainha de Celular' }` no seletor e a mesma configuração de colunas (`tipoCouro`, `corCouro`) usada para `bainha_cartao`.
8. **`src/contexts/AuthContext.tsx`** — adicionar `bainha_celular: 7` no mapa de prazos (linha 546).

## Fora de escopo

Nenhuma mudança de banco. Pedidos antigos continuam funcionando; o novo produto só aparece a partir de agora.
