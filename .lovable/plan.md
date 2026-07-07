## Objetivo
No formulário de Pedido → Bota, quando o modelo for **Botina**, liberar novas combinações de Solado, Formato do Bico e Cor da Sola — reaproveitando variações que já existem no sistema (Fino Agulha Ponta Quadrada/Redonda, PVC, Marrom), apenas vinculando-as à Botina com as regras abaixo.

## Regras

**Solado (Botina)**
- Manter os solados tradicionais atuais (Borracha, Couro Reta, Couro Carrapeta, Couro Carrapeta com Espaço Espora, Jump, Rústica).
- **Adicionar PVC** como opção.

**Formato do Bico (Botina)**
- Solado = **Couro Reta**:
  - Sempre: Quadrado, Redondo (comportamento atual).
  - **Adicionar Fino Agulha Ponta Quadrada e Fino Agulha Ponta Redonda apenas quando o tamanho for 34 a 44.** No 45, apenas Quadrado/Redondo.
- Solado = **PVC**:
  - Apenas **Fino Agulha Ponta Quadrada** (implica também tamanho 34-44).
- Demais solados: sem mudança.

**Cor da Sola (Botina)**
- Solado = **PVC**: apenas **Marrom**, sem custo adicional (R$ 0).
- Demais solados: sem mudança.

## Onde alterar

Alterações concentradas em `src/lib/orderFieldsConfig.ts`, adicionando ramo especial para `modelo === 'Botina'` antes/dentro do bloco `tradicional`:

1. `getSoladosForModelo(modelo, formatoBico)` — para Botina, incluir `PVC` além dos solados tradicionais.
2. `getBicosForModeloSolado(modelo, solado, tamanho?)` — adicionar parâmetro opcional `tamanho`; ramo Botina:
   - `PVC` → `['Fino Agulha Ponta Quadrada']`
   - `Couro Reta` + tamanho 34-44 → `['Quadrado','Redondo','Fino Agulha Ponta Quadrada','Fino Agulha Ponta Redonda']`
   - `Couro Reta` + outros tamanhos → `['Quadrado','Redondo']`
   - Demais solados → comportamento tradicional atual.
3. `getCorSolaOptions(modelo, solado, formatoBico)` — Botina + PVC → `[{ label: 'Marrom', preco: 0 }]`.
4. `getCorSolaPrecoContextual` já deriva o preço via `getCorSolaOptions`, então retornará R$ 0 automaticamente para Botina+PVC+Marrom (sem cobrar).

## Passar `tamanho` para o filtro de bicos

Atualizar as 4 chamadas de `getBicosForModeloSolado` (2 em `src/pages/OrderPage.tsx`, 2 em `src/pages/EditOrderPage.tsx`) para incluir o `tamanho` atual do formulário, e recalcular o bico quando o tamanho mudar (handler de tamanho já existe — só garantir revalidação; se o bico atual não estiver mais permitido, resetar).

## Fora do escopo
- Nenhuma alteração em preços cadastrados, PDFs, banco ou admin de fichas — as variações já existem, só está sendo vinculada a combinação ao modelo Botina.
- Nenhuma mudança em outros modelos.