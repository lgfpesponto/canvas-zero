## Mudanças

### 1. Subtítulo dos cards de extras = prazo de entrega

No grid de cards em `src/pages/ExtrasPage.tsx` (linha 877), trocar o texto repetitivo `{product.descricao}` por uma label de prazo derivada de `EXTRA_LEAD_TIMES` em `src/lib/orderDeadline.ts`.

- Adicionar helper exportado `getExtraLeadTime(productId)` (já existe) e usar em `ExtrasPage.tsx`.
- Formato exibido:
  - `1` dia útil → `"Pronta entrega (1 dia útil)"`
  - `n` dias → `"Prazo: n dias úteis"`
- Para `bota_pronta_entrega`, mostrar `"Pronta entrega (1 dia útil)"` mesmo quando recebe extras embutidos (texto do card é estático).
- Mantém o `precoLabel` na linha de baixo intacto.

### 2. Variações da Regata Pronta Entrega em lista (estilo Gravata)

Em `src/pages/ExtrasPage.tsx`, dentro do diálogo "Organizar Estoque — Regata Pronta Entrega" (linhas 1075-1089), trocar os três `<Input list>` (datalist) por `<select>` nativos no mesmo estilo visual da Gravata (linhas 981-984), populados pelas variações já salvas (`distinct('cor_tecido' | 'cor_bordado' | 'desenho_bordado')`) acrescidas de uma opção final `"+ Adicionar nova"`.

Comportamento por campo:
- Selecionar valor existente → preenche o state.
- Selecionar `"+ Adicionar nova"` → o `<select>` é substituído por um `<Input>` com botão "voltar" (X) ao lado, para digitar o novo valor.
- Após "Salvar" do estoque, o novo valor passa a aparecer automaticamente na lista das próximas aberturas (via `distinct` do `regataStockItems`).

Sem alterações em banco, RPC, preço (R$ 50) ou prazo (1 du).

### Arquivos
- `src/pages/ExtrasPage.tsx` — subtítulo do card + redesign dos 3 selects do diálogo Regata.
- (sem migrations, sem novas dependências)
