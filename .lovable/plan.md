## Duas correções: popover de extras + drafts/modelos reativos à nova versão da ficha

### Parte 1 — Popover de edição do produto extra reflete o formulário de "Comprar"

Hoje o popover mostra apenas as chaves cruas do JSONB `variacoes` — não corresponde aos campos que aparecem ao clicar em "Comprar". Passa a espelhar o formulário real de cada produto.

**Nova config por produto** em `src/lib/extraProductSchema.ts`:

```ts
type FieldSpec =
  | { key: string; label: string; kind: 'select'|'multi'|'checkbox'; source: 'variacoes'; group: string; unitPrice?: number }
  | { key: string; label: string; kind: 'text'|'number' }
  | { key: string; label: string; kind: 'select';  source: 'shared'; sharedList: 'TIPOS_COURO'|'CORES_COURO'|'TAMANHOS' };

export const EXTRA_SCHEMA: Record<string, { fields: FieldSpec[]; basePriceEditable: boolean; basePriceLabel?: string }> = {
  tiras_laterais:  { basePriceEditable: true,  fields: [{ key:'corTiras', label:'Cor das tiras', kind:'select', source:'variacoes', group:'cor_tiras' }] },
  desmanchar:      { basePriceEditable: true,  fields: [
      { key:'qualSola',   label:'Qual sola',         kind:'select', source:'variacoes', group:'qual_sola' },
      { key:'trocaGaspea',label:'Troca de gáspea',   kind:'select', source:'variacoes', group:'troca_gaspea' }, // Sim/Não com preço
  ]},
  gravata_country: { basePriceEditable: true, fields: [
      { key:'corTira',  label:'Cor da tira',   kind:'select', source:'variacoes', group:'cor_tira' },
      { key:'tipoMetal',label:'Tipo de metal', kind:'select', source:'variacoes', group:'tipo_metal' },
      { key:'corBridao',label:'Cor do bridão', kind:'select', source:'variacoes', group:'cor_bridao' },
  ]},
  adicionar_metais:{ basePriceEditable: false, fields: [
      { key:'metaisSelecionados', label:'Itens', kind:'multi', source:'variacoes', group:'itens' }, // cada item traz preço unitário
  ]},
  carimbo_fogo:    { basePriceEditable: false, fields: [
      { key:'faixaCarimbos', label:'Faixa de qtd. carimbos', kind:'select', source:'variacoes', group:'faixas' },
  ]},
  palmilha:        { basePriceEditable: true, fields: [
      { key:'formatoBicoPalmilha', label:'Formato do bico', kind:'select', source:'variacoes', group:'formato_bico' },
      { key:'tamanhoPalmilha',     label:'Tamanho',         kind:'select', source:'shared',    sharedList:'TAMANHOS' },
  ]},
  // demais: apenas basePriceEditable=true (bainha_cartao, bainha_celular, chaveiro_carimbo, kit_faca, kit_canivete, revitalizador, kit_revitalizador, regata, regata_pronta_entrega, gravata_pronta_entrega, bota_pronta_entrega)
};
```

**Popover reescrito** (`ExtraProdutoEditPopover.tsx`):
- Mostra o **nome do produto** editável (topo).
- Mostra **preço base** editável só quando `basePriceEditable` é `true`. Quando o produto tem múltiplas variações que somam o preço (ex.: `adicionar_metais`, `carimbo_fogo`), esconde o preço base — o preço vem das variações.
- Para cada `FieldSpec` do schema: um bloco com o **label** editável e a lista das variações (nome + preço), com botões **+ variação**, **excluir variação**, **excluir grupo**. Idêntico visual ao `EditPopover` da ficha.
- Ordem das variações preservada (usa índice do array).
- Campos `source: 'shared'` mostram só um aviso *"Herdado da bota — editar em Configurações > Ficha da Bota"* (sem edição inline para evitar impacto global). Fica claro o motivo.
- Botão **excluir produto** (já existe) — mantido.

**Formulário de Comprar (`renderForm`) passa a ler as variações do banco** com fallback para constantes:
- Helper `getExtraFieldOptions(productId, fieldKey)` retorna `variacoes[group]` do produto se existir, senão a constante hardcoded (`GRAVATA_COR_TIRA`, `PALMILHA_FORMATO_BICO`, etc.).
- `calcPrice` também consulta o preço da variação selecionada quando aplicável (ex.: `desmanchar` soma preços das opções `qual_sola`/`troca_gaspea` do banco; `adicionar_metais` usa preço unitário do item do banco).

### Parte 2 — Modelos rascunho e drafts reagem à versão mais recente da ficha

Tanto **`order_templates`** (banco) quanto **drafts** (`localStorage`) devem sempre ser lidos contra a **versão vigente** de `ficha_versoes` para bota/cinto.

**Regras**:
1. **Preço**: recomputa via `recomputeOrderPrice` / `getDynamicUnitPrice` no momento em que o modelo/rascunho é carregado — se `preco_adicional` mudou no banco, o pedido novo herda o novo preço. (A pipeline já faz isso ao popular o form; garantir que o `card` do modelo na `/modelos` **exiba o preço recomputado atual**, não um preço congelado.)
2. **Variação removida**: se qualquer valor salvo no `form_data`/`draft.form` não existe mais nas `ficha_variacoes` da versão atual do campo correspondente:
   - Marcar o modelo/rascunho como **inválido**.
   - No card do modelo (ModelosPage e diálogo Templates dentro do OrderPage/BeltOrderPage): mostrar badge vermelho *"variação excluída, entre para editar"* com a lista das variações removidas em tooltip.
   - **Desabilitar os botões "Preencher" e "Comprar"** desse card. Só permanece habilitado "Editar" (para o dono corrigir).
   - Ao clicar em **Editar** e ao **abrir/continuar rascunho**: carrega o form limpando os campos inválidos, mostra `toast.warning` já existente (`validateAndPopulateTemplate`), e o form fica na versão atual da ficha.
3. **Variação nova**: sem impacto — o modelo/rascunho só carrega o que foi selecionado. Novos campos disponíveis aparecem vazios (opcionais) ou continuam válidos até o usuário editar.
4. **Nome de campo renomeado**: já tratado pelo `validateFormData` atual (avisa e limpa) — mantém.
5. **Rascunho local (`salvar rascunho`) ao retomar**: sempre carrega ficha na versão mais recente (comportamento atual do `OrderPage` que faz `useEffect` com `fichaLoading`); já respeita. Adicionar validação idêntica antes de habilitar `Continuar`.

**Novo hook `useTemplateValidity(template, tipo)`** em `src/hooks/useTemplateValidity.ts`:
- Recebe o `form_data` e o tipo (`bota` / `cinto`).
- Puxa todas as `ficha_variacoes` da versão atual daquela ficha (usa `useAllVariacoesByFichaTipo` + `useFichaCampos`).
- Retorna `{ valid: boolean, removed: Array<{ campo: string; valor: string }>, currentPrice: number }`.
- Usado em:
  - `ModelosPage` — badge + desabilitar botões.
  - `TemplatesDialog` (diálogo do OrderPage/BeltOrderPage) — mesma badge e bloqueio.
  - `DraftsPage` — mesma coisa para rascunhos locais (aqui a fonte é `localStorage`).

**Recompute de preço no card do modelo**:
- Se o card exibe preço agregado, chamar `recomputeOrderPrice(cleanedFormData, versãoAtual)` para gerar o preço vigente. Substitui qualquer preço cacheado no `form_data`.
- Cache curto em React Query (`['template-price', templateId, ficha_versao_id]`) para não recalcular a cada render.

### Detalhes técnicos

Arquivos criados:
- `src/lib/extraProductSchema.ts` — spec dos campos por produto.
- `src/hooks/useTemplateValidity.ts` — validação + recompute de preço para templates/drafts.

Arquivos alterados:
- `src/components/extras/ExtraProdutoEditPopover.tsx` — reescrito para renderizar por `EXTRA_SCHEMA`; preço base condicional; grupos alinhados ao form.
- `src/pages/ExtrasPage.tsx` — `renderForm` e `calcPrice` passam a ler opções e preços do `useExtraProdutos()` via helper `getExtraFieldOptions`. Constantes viram fallback.
- `src/pages/ModelosPage.tsx` — usar `useTemplateValidity`; badge + `disabled` nos botões inválidos; exibir preço recomputado.
- `src/components/template/TemplatesDialog.tsx` — mesma badge + bloqueio.
- `src/pages/DraftsPage.tsx` — badge + bloqueio para rascunhos locais.
- `src/pages/OrderPage.tsx` / `BeltOrderPage.tsx` — nas funções `preencherModelo` / `handleUseTemplate`, se o template estiver inválido, redirecionar para modo edição (não permitir uso direto).

### Compatibilidade

- Extras: nenhuma mudança em pedidos antigos — `PRODUCT_FIELDS`, `calcPrice` fallback e RPCs permanecem. Se o admin deletar uma variação usada por um pedido antigo, o pedido antigo mantém o valor salvo em `orders`.
- Modelos: templates existentes continuam funcionando; ganham badge quando alguma variação sumir. Ordem antiga já finalizada nunca é afetada (validação só roda ao **usar** o template).
- Drafts locais: mesma coisa — só valida ao continuar, nunca ao salvar.