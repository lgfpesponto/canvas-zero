## Organizador de estoque — Regata Pronta Entrega

Replicar o padrão do organizador da Gravata Pronta Entrega para Regata PE, agora com **três campos combinados**: Cor do tecido, Cor do bordado, Desenho bordado. As variações já cadastradas viram sugestões para os próximos cadastros (estilo combobox: digita "Marrom" + Enter para criar; depois disso aparece em uma lista para selecionar).

### 1. Banco — adicionar campo `cor_bordado`

Migration na tabela `regata_stock`:
- Adicionar coluna `cor_bordado text not null default ''`.
- A unicidade da combinação passa a ser `(cor_tecido, cor_bordado, desenho_bordado)`.

As sugestões serão derivadas dos valores distintos já presentes em `regata_stock` (não cria tabela auxiliar). Como exclusão é sempre manual e admin, valores criados continuam disponíveis até o admin remover a última linha que os usa.

### 2. Diálogo "Organizar Estoque — Regata Pronta Entrega"

Layout idêntico ao da Gravata (lista atual + form para adicionar):

**Estoque atual** — cada linha: `Cor tecido + Cor bordado + Desenho bordado` com qtd, lápis (editar quantidade) e lixeira (remover).

**Adicionar ao estoque** — três campos combobox (input com sugestões existentes) + quantidade:
- Cor do tecido *
- Cor do bordado *
- Desenho bordado *
- Quantidade *

Comportamento dos comboboxes:
- Lista as opções já cadastradas (distintas, ordenadas alfabeticamente).
- Permite digitar livre; ao pressionar Enter ou ao salvar, o valor é capitalizado/trimado e salvo.
- Se a combinação `(cor_tecido + cor_bordado + desenho_bordado)` já existir, soma na linha existente (mesma lógica da gravata).

### 3. Form de compra "Regata Pronta Entrega"

Atualizar a label da variação selecionada para mostrar os 3 campos:
`{cor_tecido} + {cor_bordado} + {desenho_bordado} (X disponíveis)`

A pesquisa do `regataSearch` passa a considerar os 3 campos.

### 4. Estado e tipos

- `RegataStockItem` ganha `cor_bordado: string`.
- Estados novos: `regataStockCorBordado` (input controlado).
- Atualizar `src/integrations/supabase/types.ts` (Row/Insert/Update) com `cor_bordado`.
- Onde a variação for serializada para `extra_detalhes` (handleSubmit do regata_pronta_entrega), incluir também `corBordadoRegata`.

### 5. Exibição em pedidos existentes

- `EditExtrasPage.tsx`: bloco read-only do `regata_pronta_entrega` passa a mostrar `Cor tecido / Cor bordado / Desenho`.
- Pedidos antigos (sem `corBordadoRegata`) exibem só os campos preenchidos, sem quebrar.

### Arquivos alterados

- `supabase/migrations/<timestamp>_regata_stock_cor_bordado.sql` (nova migration)
- `src/integrations/supabase/types.ts`
- `src/pages/ExtrasPage.tsx` (estados, fetch/save, dialog organizador, form de compra, label)
- `src/pages/EditExtrasPage.tsx` (bloco read-only)

### Componente combobox

Para evitar nova dependência, uso um `<Input>` com um `<datalist>` HTML nativo ligado aos valores distintos do campo. Funciona como dropdown de sugestões + entrada livre, sem nenhum lib extra. Ex.:

```tsx
<Input list="regata-cor-tecido-options" value={...} onChange={...} />
<datalist id="regata-cor-tecido-options">
  {distinctCorTecido.map(v => <option key={v} value={v} />)}
</datalist>
```

### Não faz parte

- Não altera preço (segue R$ 50 fixo já memorizado).
- Não mexe em prazos.
- Não cria tabela separada de sugestões — sugestões derivam de `regata_stock`.
