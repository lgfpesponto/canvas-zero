

## Problema: Relacionamentos não aparecem na UI

### Causa raiz
O painel de relacionamentos do `BootFieldRenderer` itera sobre **categorias** (`ficha_categorias`) e usa `oc.slug` (slug da categoria) como chave. Porém, a migração armazenou os relacionamentos usando **slugs dos campos** (`ficha_campos.slug`).

Exemplo concreto:
- Migração salvou: `{"modelo": ["Bota Infantil"], "solado": ["Infantil"]}`
- UI procura: `rel["modelos"]`, `rel["solados-visual"]` (slugs das categorias)
- Resultado: nunca encontra match, badges nunca ficam selecionados

Além disso, o painel agrupa por **categoria**, mas vários campos compartilham a mesma categoria (ex: Solado, Formato do Bico, Cor da Sola e Cor da Vira estão todos na categoria `solados-visual`). Isso impede distinguir a qual campo o relacionamento se refere.

### Solução: duas etapas

#### 1. Atualizar o `BootFieldRenderer` para iterar por **campos** em vez de categorias
- Em vez de `otherCats = allCategorias.filter(...)`, listar os **outros campos** (`ficha_campos`) do mesmo `ficha_tipo_id`
- Cada campo aparece como seção no painel, mostrando apenas suas variações
- A chave do relacionamento passa a ser o **slug do campo** (ex: `modelo`, `solado`, `formato_bico`)
- O `handleRelChange` já salva corretamente com o slug passado; basta passar o campo slug em vez do categoria slug

Mudanças no código (`src/pages/AdminConfigFichaPage.tsx`):
- Adicionar prop `allCampos: FichaCampo[]` ao `BootFieldRenderer`
- Substituir `otherCats` por `otherCampos = allCampos.filter(c => c.id !== campo.id && (c.tipo === 'selecao' || c.tipo === 'multipla'))`
- No painel de relacionamento, iterar sobre `otherCampos`, buscando variações por `campo_id` em vez de `categoria_id`
- Usar `campo.slug` como chave do jsonb (match com a migração)

#### 2. Nenhuma alteração nos dados da migração
Os dados já estão corretos usando campo slugs (`modelo`, `solado`, `formato_bico`, `cor_vira`, `cor_sola`, `cor_couro_cano`, etc.). A correção é apenas no código da UI.

### Arquivo modificado
- `src/pages/AdminConfigFichaPage.tsx`

### Resultado esperado
Ao clicar no 🔗 de uma variação (ex: tamanho "24"), o painel mostrará os campos Modelo, Solado, Formato do Bico, etc. como seções separadas, com os badges já selecionados de acordo com os relacionamentos persistidos na migração.

