## Objetivo

Substituir o dialog "Editar ficha" por **edição inline direto na ficha de produção** (bota/cinto). O admin_master/admin_producao ativa um "modo edição" clicando no lápis, e passa a ver ícones de + e ✏️ ao lado de cada campo e categoria da própria ficha real — não em uma tela separada.

## Problemas atuais

1. O `FichaVersaoEditorDialog` mostra uma versão paralela (e incompleta) da ficha — categorias/variações não batem com o que aparece na ficha real.
2. Edição em modal desconecta o admin do contexto visual do formulário.
3. Não há como renomear campos nativos (Vendedor, Nº do Pedido, Cliente, WhatsApp).

## Solução

### 1. Modo edição inline (sem dialog)

- Botão "editar ficha" (lápis) no topo de `OrderPage` (bota), `BeltOrderPage` (cinto) e `DynamicOrderPage` (extras) vira **toggle** de um `FichaEditContext`.
- Quando ativo:
  - Borda tracejada laranja em cada bloco de categoria e cada campo.
  - Barra fixa no rodapé com **"salvar nova versão"** / **"descartar"** / campo opcional de descrição da mudança.
- Deletar `FichaVersaoEditorDialog` (não é mais usado).

### 2. Controles inline por elemento

**Em cada categoria** (cabeçalho laranja tipo "IDENTIFICAÇÃO"):
- ✏️ renomear categoria (popover pequeno com input do nome)
- 🗑️ excluir categoria
- **+ campo** no fim da categoria

**Em cada campo (label acima do input)**:
- ✏️ ao lado do nome → popover com:
  - nome do campo (todos os tipos)
  - se `checkbox` com valor: preço do "sim"
  - se `selecao`/`multipla`: **lista das variações existentes** com nome + preço editáveis inline, botão 🗑️ por variação, e **+ variação** no fim
  - relacionamento condicional: seletor que lista as variações de outros campos já criados (marcar quais liberam esta variação) — grava em `relacionamento` JSONB no formato já usado
- ➕ ao lado do nome → adiciona nova variação (para selecao/multipla) OU nova opção sim/não (checkbox). Em campos tipo `texto` o ➕ fica oculto (só o ✏️ para renomear).

### 3. Renomear campos nativos

Campos "hardcoded" (Vendedor, Nº do Pedido, Cliente, WhatsApp, quantidade, preço base) hoje vivem no JSX, não em `ficha_campos`. Criar tabela leve `ficha_labels_overrides` **NÃO** — em vez disso, incluir esses labels no `snapshot` da versão via `ficha_campos` sintéticos com `tipo='nativo'` e `slug` fixo (`vendedor`, `numero_pedido`, `cliente`, `whatsapp`, `quantidade`, `preco_base`). O JSX passa a ler o label pelo slug do snapshot ativo, com fallback para o texto atual.

- Migration: inserir esses campos "nativos" na `ficha_campos` de cada ficha_tipo se não existirem, marcados com `tipo = 'nativo'` (não renderizam input dinâmico, só servem para o label).
- Ficha em modo edição mostra ✏️ neles também, permitindo renomear.
- Checkbox com preço (`trisce`, `tiras` etc.): editor permite mudar o valor do "sim" — grava em `opcoes` como `[{label:'sim', preco_adicional: X}]`.

### 4. Salvamento

- Todas as edições ficam em estado local do `FichaEditContext` (dirty).
- Ao clicar "salvar nova versão":
  1. Aplica os diffs nas tabelas `ficha_categorias`/`ficha_campos`/`ficha_variacoes` (upsert/delete conforme necessário).
  2. Chama `salvarNovaVersao(ficha_tipo_id, descricao)` — snapshot já usa `buildSnapshotAtual`, então captura o estado novo.
  3. Invalida queries de `useFichaCampos`, `useFichaCategorias`, `useFichaVariacoes`.
  4. Toast + sai do modo edição.

### 5. Histórico

- Aba "Histórico de Fichas" em `/admin/configuracoes` (já existe via `HistoricoFichasTab`) continua igual — só passa a listar as versões geradas pelo novo editor inline.

## Arquivos afetados

**Novos:**
- `src/contexts/FichaEditContext.tsx` — estado global do modo edição + buffer de mudanças pendentes.
- `src/components/ficha-edit/FichaEditToggle.tsx` — botão lápis no topo (substitui `EditFichaButton`).
- `src/components/ficha-edit/FichaEditBar.tsx` — barra flutuante de salvar/descartar.
- `src/components/ficha-edit/CategoriaEditControls.tsx` — ✏️/🗑️/+campo por categoria.
- `src/components/ficha-edit/CampoEditControls.tsx` — ✏️/➕ por campo, popover com variações + relacionamento.
- `src/components/ficha-edit/VariacaoRow.tsx` — linha editável nome/preço/🗑️.

**Editados:**
- `src/pages/OrderPage.tsx`, `src/pages/BeltOrderPage.tsx`, `src/pages/DynamicOrderPage.tsx` — envolver com `FichaEditProvider`, trocar `EditFichaButton` por `FichaEditToggle`, passar os labels nativos por `useFichaLabel(slug)`.
- `src/hooks/useAdminConfig.ts` — hook `useFichaLabel(fichaTipoId, slug, fallback)`.

**Excluídos:**
- `src/components/admin/FichaVersaoEditorDialog.tsx`
- `src/components/orders/EditFichaButton.tsx`

**Migration:**
- Inserir campos nativos (`vendedor`, `numero_pedido`, `cliente`, `whatsapp`, `quantidade`, `preco_base`) com `tipo='nativo'` em cada `ficha_tipo` (bota/cinto), somente se não existirem, dentro de uma categoria `identificacao` (criando se preciso). Não altera renderização, só permite renomear.

## Fora de escopo

- Reordenação drag-and-drop (fica pra depois).
- Editar campos "nativos" que envolvem lógica (quantidade, preço base) além do label.

## Confirmação necessária

Antes de implementar, uma dúvida:

**Relacionamento condicional entre variações** — no editor atual isso é JSON cru. Quer que o popover mostre um seletor amigável tipo "esta variação aparece SE em [campo X] for selecionado [variação Y, Z]"? (Recomendo sim, senão continua difícil de usar.)
