## Objetivo

No diálogo "Compartilhar vitrine", permitir dois novos filtros aplicados **apenas ao link gerado** (sem alterar os filtros da tela do Estoque):

1. **Buscar por nome do modelo** — campo de texto que sobrepõe o `search` da página.
2. **Filtro de tamanho** — chips multi-seleção, exibidos **somente** quando a página do Estoque não já tiver um filtro de tamanho ativo.

## Mudanças

### `src/components/estoque/CompartilharVitrineDialog.tsx`
- Adicionar estados locais `searchLocal` (inicializado com a prop `search`) e `tamanhosLocal` (Set, iniciando vazio).
- Novo campo `<Input>` "Buscar modelo" acima da caixa de preços, ligado a `searchLocal`.
- Nova seção "Tamanhos" com chips multi-seleção usando a nova prop `tamanhosDisponiveis` (union de todos os tamanhos com estoque). Renderizada apenas quando `tamanhos.size === 0` (nenhum filtro de tamanho vindo da página).
- Adicionar contador dinâmico: recalcular quantos produtos entram no link considerando os filtros locais (aceita uma prop `getPreviewCount(searchLocal, tamanhosLocal)` opcional; se não fornecida, mostra o total base).
- No `useMemo` do payload, usar `searchLocal.trim()` e `tamanhosLocal` (ou fallback à prop `tamanhos` quando houver).

### `src/pages/EstoquePage.tsx`
- Calcular `tamanhosDisponiveis` = ordem numérica dos tamanhos únicos com `quantidade > 0` em `groups`.
- Passar como prop nova para `CompartilharVitrineDialog`.
- Passar um `getPreviewCount(searchLocal, tamanhosLocal)` que reaproveita a mesma lógica de filtragem já existente (nome/sku + tamanho com estoque + filtros de ficha atuais) para atualizar o contador ao vivo dentro do diálogo.

## Observações
- Filtros de ficha (couro, solado, etc.) continuam vindo da página como hoje — só nome e tamanho são editáveis no diálogo, conforme pedido.
- Quando a página já tem tamanho selecionado, a seção de tamanhos no diálogo simplesmente não aparece, evitando dois lugares para o mesmo filtro.
- Nada muda na página `VitrinePublicaPage` — o token já suporta `search` e `tamanhos`.