## Objetivo

Colocar **➕ e ✏️ inline ao lado de cada label** da ficha de bota e cinto (sem popup grande), acionados por um botão "modo edição" no topo da página. O popup do lápis vira o mesmo popover leve que já criei no dialog (nome do campo + variações + preços + relacionamento amigável).

Também aplicar a versão "amigável" do relacionamento (já pronta no dialog) — checkboxes por campo em vez de JSON.

## Componentes novos

1. **`src/contexts/FichaEditContext.tsx`**
   - Estado global: `editMode: boolean`, `fichaTipoId: string`, `setEditMode`, `save/discard`.
   - Provider envolve `OrderPage`, `BeltOrderPage`, `DynamicOrderPage`.

2. **`src/components/ficha-edit/FichaEditToggle.tsx`**
   - Botão "editar ficha" (lápis) no topo. Só visível para `admin_master` / `admin_producao`.
   - Ao ativar: mostra a barra flutuante + injeta borda tracejada laranja discreta em cada bloco (via classe global aplicada no `<body>` ou no wrapper da página).

3. **`src/components/ficha-edit/FichaEditBar.tsx`**
   - Barra fixa no rodapé quando `editMode`. Botões: "descartar" · "salvar como nova versão" · input opcional de descrição.
   - Ao salvar: chama `salvarNovaVersao(fichaTipoId, descricao)`, invalida queries, sai do modo.

4. **`src/components/ficha-edit/FichaFieldControls.tsx`** — o coração da UX inline.
   - Props: `slug`, `fichaTipoId`, `defaultNome` (fallback), `defaultTipo` ('texto'|'selecao'|'multipla'|'checkbox'), `categoriaSlug?` (para autocriar o campo na categoria certa se ainda não existe).
   - Se `editMode === false` → retorna `null`.
   - Se `editMode === true` → renderiza inline dois ícones (mesmo tamanho de um badge) ao lado do texto do label:
     - **➕** (só para selecao/multipla): prompt rápido nome+preço → cria variação.
     - **✏️**: popover leve com:
       - Nome do campo (editar → update `ficha_campos.nome` ou cria stub se não existir)
       - Toggle obrigatório
       - Se `tipo === 'checkbox'`: input de preço (opcoes[0].preco_adicional)
       - Se `tipo === 'selecao'|'multipla'`: lista das variações do campo com nome/preço editáveis + 🗑️ + linha "+ nova variação". Reusa `VariacaoRow` (já pronto no editor).
       - Relacionamento condicional amigável (já pronto): botão `Link2` por variação abre a checklist.
   - Se o slug não tem `ficha_campos` correspondente, o popover primeiro cria a linha (upsert em `ficha_campos` com `ficha_tipo_id`, `categoria_id`, `slug`, `nome`, `tipo`) e daí em diante age normalmente.

5. **`src/components/ficha-edit/FichaCategoryControls.tsx`**
   - Colocado ao lado do cabeçalho laranja das categorias (IDENTIFICAÇÃO, MODELO, etc.) — renomear categoria + **+ campo**.

## Wiring nas páginas

**`src/pages/OrderPage.tsx` (~30 labels):**
- Envolver com `FichaEditProvider fichaSlug="bota"`.
- No topo, substituir `EditFichaButton` por `FichaEditToggle`.
- Ao lado de cada `<label className={cls.label}>NomeDoCampo…</label>`, adicionar
  `<FichaFieldControls slug="..." defaultTipo="..." categoriaSlug="..." />` como filho.
- Ao lado dos cabeçalhos de categoria (IDENTIFICAÇÃO / MODELO / COURO / BORDADOS / SOLADOS / etc.) inserir `FichaCategoryControls slug="..."`.
- Não mudar comportamento nem valores dos inputs — só adicionar controles condicionais.

**`src/pages/BeltOrderPage.tsx` (~21 labels):** mesma coisa com `fichaSlug="cinto"`.

**`src/pages/DynamicOrderPage.tsx`:** mais fácil, já é data-driven; injetar controles no `DynamicField` e no cabeçalho.

**Renderizar `FichaEditBar` uma vez em cada uma das três páginas**, dentro do provider.

## Migration

Nada obrigatório. Os slugs de campos hardcoded que ainda não existem em `ficha_campos` (ex.: `nome_produto`, `whatsapp`, `foto_referencia`, alguns `laser_*`, `recorte_*`) serão criados sob demanda pelo popover quando o admin clicar em ✏️ pela primeira vez — assim não sujamos o banco com stubs de campos que ninguém quer editar.

## Reuso do que já existe

- `VariacaoRow` (já criado) — reutilizada dentro do popover inline.
- `salvarNovaVersao` — reutilizado no `FichaEditBar`.
- Relacionamento amigável — já implementado no popover `Link2`.

## Fora de escopo (para próxima)

- Reordenar campos por drag-and-drop.
- Editar labels de campos que não são visíveis na ficha atual (ex.: campos legados só em ficha antiga).
- Ajuste visual fino da borda tracejada / animações do modo edição.

## Riscos e mitigações

- **Muitos labels** (~50 no total): a inserção é mecânica e não altera JSX estrutural — o risco é typo de slug. Vou seguir a nomenclatura já existente em `ficha_campos` (query rodada mostra os slugs canônicos: `vendedor`, `numero_pedido`, `cliente`, `tamanho`, `modelo`, `couro_cano`, `cor_couro_cano`, `bordado_cano`, `laser_cano`, `recorte_cano`, etc.).
- **Layout dos ícones**: renderizados com `inline-flex ml-1 opacity-70 hover:opacity-100`, sem quebrar o flow do label. Não aparecem quando `editMode = false`, então a UX normal fica intacta.
