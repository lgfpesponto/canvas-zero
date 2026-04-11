

## Plano: Vinculação Condicional de Cor do Couro ao Tipo de Couro

### Contexto

Atualmente, `TIPOS_COURO` e `CORES_COURO` em `src/lib/orderFieldsConfig.ts` são listas independentes. O usuário quer que certas cores só apareçam quando um tipo específico de couro for selecionado. Isso afeta 4 páginas (OrderPage, EditOrderPage, ExtrasPage, EditExtrasPage) e potencialmente fichas dinâmicas.

### Regras de Vinculação

| Tipo de Couro | Cores Exclusivas |
|---|---|
| Crazy Horse | Nescau (+ cores gerais) |
| Escamado | Nescau (+ cores gerais) |
| Nobuck | Chocolate (+ cores gerais) |
| Estilizado em Tilápia | Chocolate (+ cores gerais) |
| Látego | Marrom (+ cores gerais) |
| Estilizado em Cobra | Marrom (+ cores gerais) |
| Estilizado em Jacaré | Marrom (+ cores gerais) |
| Estilizado em Avestruz | Marrom (+ cores gerais) |
| Estilizado em Dinossauro | Marrom (+ cores gerais) |
| Estilizado em Tatu | Marrom (+ cores gerais) |
| Vaca Holandesa | Malhado, Preto, Branco (SOMENTE estas) |
| Vaca Pintada | Caramelo, Preto e Branco (SOMENTE estas, criar novas) |
| Metalizado (NOVO tipo) | Rosa Neon (SOMENTE esta) |

**Nota**: "Nescau", "Chocolate" e "Marrom" são cores que existem na lista geral mas só devem aparecer para os tipos vinculados. "Vaca Holandesa", "Vaca Pintada" e "Metalizado" são tipos com cores 100% exclusivas (nenhuma cor geral aparece).

### Implementação

#### 1. Novo mapa de vinculação em `src/lib/orderFieldsConfig.ts`

Criar constante `COURO_COR_VINCULOS` que define:
- Cores exclusivas por tipo (tipos com lista fechada como Vaca Holandesa)
- Cores restritas que só aparecem em certos tipos (Nescau, Chocolate, Marrom)
- Função helper `getCoresCouroFiltradas(tipoCouro: string): string[]` que retorna as cores disponíveis dado o tipo selecionado

Adicionar "Metalizado" a `TIPOS_COURO`, adicionar "Caramelo" e "Preto e Branco" a `CORES_COURO`.

#### 2. Atualizar `src/pages/OrderPage.tsx`

Substituir o uso direto de `CORES_COURO` nos 3 campos de cor (cano, gáspea, taloneira) pela função `getCoresCouroFiltradas(tipoCouroX)`. Quando o tipo de couro mudar, limpar a cor se ela não for válida para o novo tipo.

#### 3. Atualizar `src/pages/EditOrderPage.tsx`

Mesma lógica: filtrar cores com base no tipo selecionado para cada par (cano, gáspea, taloneira).

#### 4. Atualizar `src/pages/ExtrasPage.tsx`

Nos campos de "Tipo de couro" e "Cor do couro" dos extras (bainha, kit_canivete, kit_faca, etc.), usar `getCoresCouroFiltradas(form.tipoCouro)`.

#### 5. Atualizar `src/pages/EditExtrasPage.tsx`

Mesma lógica para a edição de extras.

#### 6. Fichas Dinâmicas (DynamicOrderPage)

As fichas dinâmicas usam campos configuráveis via `ficha_campos`. A vinculação tipo→cor é específica do domínio de couros e não se aplica automaticamente a campos genéricos. Se o admin criar campos "tipo de couro" e "cor do couro" numa ficha dinâmica, eles serão campos independentes. A vinculação condicional se aplica apenas às fichas que usam `TIPOS_COURO`/`CORES_COURO` do `orderFieldsConfig.ts`.

### Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/lib/orderFieldsConfig.ts` | Adicionar "Metalizado", "Caramelo", "Preto e Branco"; criar mapa `COURO_COR_VINCULOS` e helper `getCoresCouroFiltradas()` |
| `src/pages/OrderPage.tsx` | Filtrar cores por tipo em cada par couro; limpar cor ao trocar tipo |
| `src/pages/EditOrderPage.tsx` | Idem |
| `src/pages/ExtrasPage.tsx` | Filtrar cores por tipo nos extras |
| `src/pages/EditExtrasPage.tsx` | Idem |

### Detalhes Técnicos

A função `getCoresCouroFiltradas` terá esta lógica:
1. Se o tipo tem lista fechada (Vaca Holandesa, Vaca Pintada, Metalizado) → retorna somente suas cores exclusivas
2. Caso contrário → retorna `CORES_COURO` geral, removendo cores restritas (Nescau, Chocolate, Marrom), e adicionando de volta apenas as que pertencem ao tipo selecionado
3. Se nenhum tipo selecionado → retorna `CORES_COURO` sem as cores restritas

