## Parte 1 — Melhorar o modal "Filtros da ficha"

Arquivo: `src/components/common/FichaFiltersDialog.tsx`

1. **Não repetir nome do campo quando é único na categoria**
   - Dentro de cada categoria da accordion, se ela só tem um único campo, renderizar apenas os chips (sem o `<h4>` com label). Se tiver 2+ campos, manter label. Isso resolve "Acessórios > Acessórios" e "Tamanho / Gênero / Modelo > Tamanho" (que virará categoria com só "Tamanho Cinto").

2. **Filtrar campos que não devem aparecer**
   - Excluir do dialog as chaves: `tamanho`, `modelo`, `genero` da categoria "Tamanho / Gênero / Modelo" quando aparecem repetidas — Modelo/Gênero ficam só no topo (já ficam), e Tamanho (de bota) some totalmente. `tamanho_cinto` permanece.
   - Excluir a categoria "Pesponto" inteira (hardcode por slug `pesponto`).

3. **Ordem fixa das categorias**
   - Sobrepor `categoriaOrdem` por uma ordem manual: `couros`, `solados`, `bordados`, `laser_e_recortes` (ou o slug real), `metais`, `extras`, `tamanho_genero_modelo` (agora só com Tamanho Cinto), `fivelas`. Categorias fora da lista vão ao final na ordem original.

4. **Accordions sempre começam fechadas**
   - Trocar o `useEffect` que auto-expande por: quando `open` vira true e não há query, resetar `expanded = []`. Só auto-expandir enquanto houver query de busca ativa. Ao limpar a busca, colapsar tudo novamente.

5. **Busca mostra só variações que casam (sem cabeçalho de campo)**
   - Quando há `query`, renderizar uma lista plana (flat) de chips das variações que casam, sem agrupar por categoria nem mostrar label do campo. Cada chip continua chamando `onToggle(k.key, v)`.
   - Sem query: comportamento em accordion normal (fechada).

## Parte 2 — Pré-preenchimento "sugerido" de Tipo/Cor Couro

Arquivo: `src/pages/OrderPage.tsx` (fluxo bota).

1. **Estado de "sugestão"**
   - Novo state `couroSugerido: { tipoCano?: boolean; tipoGaspea?: boolean; tipoTaloneira?: boolean; corCano?: boolean; corGaspea?: boolean; corTaloneira?: boolean }`.

2. **Regra de auto-preenchimento**
   - Ao alterar `tipoCouroCano` (via user), se `tipoCouroGaspea` estiver vazio, setá-lo com o mesmo valor e marcar `tipoGaspea=true`. Idem para `tipoCouroTaloneira`. Mesma lógica quando o usuário edita Gáspea (propaga para Cano/Taloneira vazios) e Taloneira (propaga para Cano/Gáspea vazios).
   - Mesma lógica para `corCouroCano/Gaspea/Taloneira`.
   - Ao editar manualmente um campo já preenchido, remover o flag de "sugerido" daquele campo (fica como escolha do usuário). Se o campo alvo já tinha valor, não sobrescrever.
   - Também respeitar o filtro dinâmico: se a cor sugerida não estiver nas opções válidas para o tipo daquela parte, não propagar.

3. **Tag "Sugerido" na UI**
   - Ampliar `SelectField` local com prop opcional `suggested?: boolean`. Quando true, renderizar um `<Badge variant="secondary" className="ml-2 text-[10px]">Sugerido</Badge>` ao lado do label.
   - Passar `suggested={couroSugerido.tipoGaspea}` etc. nos 6 campos de couro.

4. **Escopo**
   - Só na página `OrderPage` (pedido novo de bota). Não altera `EditOrderPage` nem cinto.
   - Não altera cálculo de preço nem persistência — os campos já são salvos normalmente; o flag "sugerido" é apenas visual/UX e não vai para o banco.

## Fora de escopo
- Nenhuma mudança em migrations, snapshots, cálculo de preço, PDFs ou permissões.
- Estoque continua com filtros estáticos, sem categorias.
