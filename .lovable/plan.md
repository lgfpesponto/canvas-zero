# Editor de ficha inline — corrigir sem quebrar regras

Regra confirmada: **somente `admin_master` pode editar a ficha**. `admin_producao` (Fernanda/Mariana) **não** pode. Nenhum pedido antigo é alterado — o mecanismo de "nova versão" (`salvarNovaVersao` + snapshots de preço e `lead_time_snapshot`) já garante isso e não será tocado.

## O que continua exatamente como está

- Fluxo de "salvar nova versão" — pedidos antigos permanecem intactos.
- Snapshots de preço, `lead_time_snapshot`, `ficha_versoes`.
- Regras de preço obrigatório (`priceValidation.ts`) e regras de cor/couro contextuais.
- Cache invalidations em `useInsertVariacao` / `useUpdateVariacao`.

## Correções

### 1. Restringir editor de ficha a `admin_master`
- `src/components/orders/EditFichaButton.tsx`: mudar a guarda para `user.role === 'admin_master'` apenas — remover `admin_producao`.
- `src/components/ficha-edit/FichaEditToggle.tsx` já usa `isAdmin` do `FichaEditContext`, que já é `admin_master` — nenhuma mudança.
- `src/contexts/FichaEditContext.tsx`: já correto (`isAdmin = role === 'admin_master'`).
- Não mexer em RLS (proteção server-side segue como está).

### 2. Novas variações não aparecem em campos que ainda leem só constantes
O plano anterior em `.lovable/plan.md` já cobre a maior parte para bota (couros, cores, bordado, laser, recorte, metais, glitter, linha, borrachinha, vivo — via `mergeFieldOptions` no `OrderPage`). Fechar os dois pontos que faltam:

- **Acessórios (bota)**: `OrderPage.tsx` linha 2181 usa `ACESSORIOS` puro. Trocar por `mergeFieldOptions('acessorios', ACESSORIOS)` e, no cálculo de `acessoriosPreco` (linha 1063) e no snapshot (linha 1502), usar `findFichaPrice(nome, 'acessorios') ?? ACESSORIOS.find(...)?.preco ?? 0`.
- **Cinto / extras (`DynamicOrderPage`, `BeltOrderPage`, `EditBeltPage`)**: hoje não importam `useFichaVariacoesLookup`/`useDynamicFieldFilter` nem fazem merge. Criar um `mergeFieldOptions` local (mesma assinatura da bota) e aplicar em cada `SelectField`/`MultiSelect` que hoje lê constante hardcoded (cor de couro, tipo de couro, fivela, cor de fivela, bordado, laser, recorte). Preço via `findFichaPriceContextual` com fallback para a constante.

### 3. Criar campo novo com typo silencioso
`handleAddCampo` (dentro do dialog) usa `window.prompt('Tipo (texto | selecao | multipla | checkbox)', 'selecao')`. Se o admin digitar "seleção" acentuado, o campo entra quebrado. Substituir por um mini `Dialog` com Input (nome) + Select fechado (`seleção / múltipla / checkbox / texto`) + Switch (obrigatório). Sem mudar schema.

## Fora deste plano

- Não altera lógica de snapshot / preço congelado.
- Não altera pedidos existentes.
- Não altera RLS nem edge functions.
- Não altera nada para `admin_master` além de melhorar o form de criar campo.

## Detalhes técnicos

- Arquivos tocados: `src/components/orders/EditFichaButton.tsx`, `src/components/admin/FichaVersaoEditorDialog.tsx`, `src/pages/OrderPage.tsx`, `src/pages/DynamicOrderPage.tsx`, `src/pages/BeltOrderPage.tsx`, `src/pages/EditBeltPage.tsx`.
- Sem migração SQL. Sem edge functions.

## Como validar

1. Logar como `admin_producao` → botão "editar ficha" some no formulário de pedido.
2. Logar como `admin_master` → botão continua, dialog funciona igual, com o mini-form novo para criar campo.
3. Adicionar variação nova em **Acessórios**, **Cinto → Cor da Fivela** e **Cinto → Cor Couro** → aparece no formulário respectivo com o preço cadastrado.
4. Abrir um pedido antigo → nada muda (snapshot preservado).
