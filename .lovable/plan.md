# Adicionar Produto Extra: Palmilha

## Resumo
Novo produto na página de Extras, comportamento idêntico aos demais (entra como pedido normal, prazo Pronta Entrega = 1 dia útil, valor R$ 10,00/unidade).

## Campos do formulário
- **Vendedor** — pré-preenchido para usuários `vendedor`/`vendedor_comissao` (regra global já existente, sem mudança)
- **Nº do Pedido** — campo padrão dos extras (gerado/validado pela regra atual `7E-AAAA0001`)
- **Cliente** — opcional (padrão dos extras)
- **Tamanho** — select obrigatório: 24 a 45 (reutiliza `TAMANHOS` de `orderFieldsConfig.ts`)
- **Formato do Bico** — select obrigatório: **Quadrado, Redondo, Fino**
  - Lista nova e independente (não usa `BICOS` da bota)
- **Quantidade** — numérico ≥ 1 (padrão dos extras que cobram por unidade, ex.: Revitalizador)

## Cálculo de preço
`valor = 10 × quantidade` (igual ao padrão de Revitalizador Unidade).

## Detalhes técnicos

### `src/lib/extrasConfig.ts`
- Adicionar em `EXTRA_PRODUCTS`:
  ```ts
  { id: 'palmilha', nome: 'Palmilha', descricao: 'Palmilha pronta entrega', precoBase: 10, precoLabel: 'R$ 10,00/un' }
  ```
- Adicionar em `EXTRA_DETAIL_LABELS`:
  ```ts
  tamanhoPalmilha: 'Tamanho',
  formatoBicoPalmilha: 'Formato do Bico',
  ```
- Exportar `PALMILHA_FORMATO_BICO = ['Quadrado', 'Redondo', 'Fino']`

### `src/pages/ExtrasPage.tsx` e `src/pages/EditExtrasPage.tsx`
- Adicionar bloco de formulário quando `tipoExtra === 'palmilha'` com:
  - SearchableSelect Tamanho (usa `TAMANHOS`)
  - SearchableSelect Formato do Bico (usa `PALMILHA_FORMATO_BICO`)
  - Input numérico Quantidade (default 1)
- Cálculo: `dados.valor = 10 * quantidade`
- Validação: tamanho e formato obrigatórios

### Prazo
Em `docs/BUSINESS_RULES.md` extras já são 1 dia útil — Palmilha herda automaticamente (sem mudança em `orderDeadline.ts`).

### PDFs / Detalhe do pedido
`OrderDetailPage` e geradores de PDF já renderizam `extra_detalhes` via `EXTRA_DETAIL_LABELS` — os novos campos aparecem automaticamente.

### Banco de dados
Nenhuma migração necessária — extras são armazenados em `orders.extra_detalhes` (JSONB) e `tipo_extra` é texto livre.

### Documentação
Atualizar `docs/BUSINESS_RULES.md` seção N (Extras) adicionando linha "Palmilha — R$ 10,00/un".

## Fora de escopo
- Sem controle de estoque (diferente de Gravata/Regata Pronta Entrega)
- Sem vínculo com bota
- Sem variações de cor/material
