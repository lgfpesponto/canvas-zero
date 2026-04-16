

## Correção: Metais, Strass, Cruz, Bridão e Cavalo não aparecem na ficha impressa sem "Área Metal"

### Problema
No PDF (`pdfGenerators.ts` linhas 355-367), toda a seção METAIS só é criada quando `order.metais` (Área Metal) está preenchido. Se o usuário marca apenas Strass, Cruz, Bridão ou Cavalo sem selecionar área de metal, nada aparece na ficha impressa.

Além disso, **Cavalo (metal)**, **Franja** e **Corrente** — que são salvos dentro de `extraDetalhes` (JSONB) — **nunca são renderizados no PDF nem na página de detalhes** (`OrderDetailPage.tsx`).

### Correção proposta

#### 1. PDF (`src/lib/pdfGenerators.ts`)
- Extrair `cavaloMetal`, `franja`, `corrente` de `order.extraDetalhes`
- Substituir a condição `if (order.metais)` por uma verificação abrangente:
  ```
  hasMetalData = metais || tipoMetal || corMetal || strassQtd || 
                 cruzMetalQtd || bridaoMetalQtd || cavaloMetalQtd
  ```
- Dentro do bloco, montar "Metais:" só se houver área/tipo/cor
- Montar os extras (strass, cruz, bridão, cavalo) independentemente
- Adicionar franja e corrente na seção EXTRAS do PDF

#### 2. Detalhes do pedido (`src/pages/OrderDetailPage.tsx`)
- Adicionar na lista `details` (após Bridão):
  - `['Cavalo (metal)', ...]` lendo de `order.extraDetalhes`
  - `['Franja', ...]` lendo de `order.extraDetalhes`  
  - `['Corrente', ...]` lendo de `order.extraDetalhes`
- Adicionar no breakdown de preço:
  - Cavalo metal (qtd × R$5)
  - Franja (R$15)
  - Corrente (R$10)

### O que NÃO muda
- Formulário de pedido (já funciona corretamente)
- Dados salvos no banco
- Estrutura geral do PDF

