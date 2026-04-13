
Descobri o motivo principal do problema dos botões de editar em “Tamanho”, “Gênero” e “Modelo” na ficha de produção da bota.

1. Causa real
- Esses campos estão sendo renderizados pelo `BootFieldRenderer`.
- O `BootFieldRenderer` só busca variações ligadas diretamente ao campo por `campo_id`:
  - `varsByCampo.get(campo.id)` em `src/pages/AdminConfigFichaPage.tsx:877-883`
- Porém, as opções clássicas da bota (`tamanhos`, `generos`, `modelos`) continuam definidas como fallback/categoria:
  - `BOOT_FALLBACK_MAP` em `src/pages/AdminConfigFichaPage.tsx:1755-1759`
- Ou seja: a página tem duas lógicas diferentes:
  - lógica antiga por categoria/fallback
  - lógica nova por campo (`campo_id`)
- Para esses três campos, a interface visual existe, mas o editor do `BootFieldRenderer` não recebe corretamente o conjunto de variações que o usuário espera editar.

2. Por que parece que “clico no lápis e nada acontece”
- O lápis do nome do campo abre só a edição do título do campo.
- O lápis de variações depende de `activeVars`, que vem apenas das variações com `campo_id`.
- Como “Tamanho”, “Gênero” e “Modelo” ainda vivem principalmente no fluxo de fallback/categoria, esse editor fica inconsistente ou vazio para esses casos.
- Isso explica por que alguns campos funcionam e esses três não.

3. Evidências no código
- `BootFormLayout` monta variações só por `campo_id`:
  - `src/pages/AdminConfigFichaPage.tsx:825-835`
- `BootFieldRenderer` recebe `variacoes={fieldVars}`:
  - `src/pages/AdminConfigFichaPage.tsx:877-892`
- `activeVars` depende apenas desse array:
  - `src/pages/AdminConfigFichaPage.tsx:1041-1044`
- Já os dados de “Tamanho”, “Gênero” e “Modelo” existem no fallback por slug:
  - `src/pages/AdminConfigFichaPage.tsx:1755-1759`

4. Fator secundário encontrado
- Há warning real do modal:
  - `Missing Description or aria-describedby for DialogContent`
- Isso precisa ser corrigido, mas não é a causa principal da falha desses três campos. É mais um problema de acessibilidade/estabilidade do dialog.

5. Plano de correção
- Unificar a edição desses campos da bota para que `BootFieldRenderer` também consiga trabalhar com fallback/categoria quando não houver variações vinculadas por `campo_id`.
- Prioridade:
  1. detectar quando o campo da bota corresponde a slugs como `tamanhos`, `generos`, `modelos`
  2. montar uma lista mesclada:
     - variações do banco por `campo_id`
     - ou, se estiver vazio, fallback/categoria por slug
  3. fazer o editor abrir sempre com itens reais para esses campos
  4. salvar novas edições convertendo fallback em registro persistido no banco
  5. manter tudo em ordem alfabética
  6. adicionar `DialogDescription` nos modais para eliminar o warning

6. Implementação sugerida
- Arquivo principal:
  - `src/pages/AdminConfigFichaPage.tsx`
- Ajustes:
  - criar um resolvedor de variações da bota por campo/slug
  - reutilizar a mesma lógica de merge já usada em `AdminEditableOptions`
  - aplicar isso especificamente em `BootFieldRenderer`
- Arquivo secundário:
  - `src/components/ui/dialog.tsx` ou os usos do dialog em `AdminConfigFichaPage.tsx`
- Ajustes:
  - garantir `DialogDescription` nos modais de edição

7. Resultado esperado após a correção
- editar “Tamanho”, “Gênero” e “Modelo” passa a funcionar
- apagar e alterar variações desses campos passa a funcionar
- a lista continua em ordem alfabética
- o comportamento fica consistente entre campos nativos da bota e campos criados no banco

Detalhes técnicos
```text
Hoje:
campo da bota -> BootFieldRenderer -> busca só por campo_id
                               -> Tamanho/Gênero/Modelo ainda dependem de fallback/categoria
                               -> editor inconsistente

Depois:
campo da bota -> BootFieldRenderer -> busca por campo_id
                               -> se vazio, resolve por slug/fallback + DB da categoria
                               -> editor sempre recebe itens editáveis
```
