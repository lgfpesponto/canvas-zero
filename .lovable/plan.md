## Refatorar modal "Comprar" em `/modelos`

Refazer o fluxo de compra a partir da página Modelos para que tudo aconteça sem sair da grade — modal de identificação por cima, espelho por cima do modal, e ao finalizar volta para a grade pronta para comprar o próximo.

### 1. Campos do modal (nova ordem e regras)

Ordem fixa:

1. **Número do pedido** *(obrigatório, texto livre)* — sempre visível, digitado à mão.
2. **Vendedor**
   - `admin_master` / `admin_producao`: `<select>` com `allProfiles` (mesma lista do OrderPage), incluindo "Estoque" / "Juliana Cristina Ribeiro" / "Rancho Chique" conforme regras existentes.
   - Demais papéis: campo travado com o `nomeCompleto` do usuário logado (readonly, sem select). Não editável.
3. **Cliente** — sempre visível. **Obrigatório apenas se vendedor = "Juliana Cristina Ribeiro"**. Nos demais casos é opcional.
4. **WhatsApp do Cliente** — **só aparece** quando vendedor = "Juliana Cristina Ribeiro" ou "Rancho Chique". Máscara `maskPhoneBR`.
5. **Tamanho / Grade**
   - Dropdown alimentado por `template.tamanhos_skus[].tamanho` (as variações cadastradas no modelo rascunho para aquele Modelo). Se o modelo não tem `tamanhos_skus`, cair no `TAMANHOS` padrão.
   - Botão **"Gerar Grade"** ao lado do label, idêntico ao OrderPage (abre `GradeEstoque` com `initialItems={gradeItems}`, aceitando apenas os tamanhos do modelo). Quando `gradeItems.length > 0`, o dropdown vira o resumo `X tam. (Y pedidos)` clicável para editar.
   - Regras de exibição do botão Grade: mesmas do OrderPage (admin com Estoque/Juliana OU vendedor comum). Para Rancho Chique / demais vendedores, apenas o select simples.
6. **Sob medida** (só quando o modelo não tem o valor preenchido) — mantém checkbox + descrição.
7. **Observação** — sempre por último, textarea.

Campos que já vêm preenchidos no `form_data` continuam sendo "faltantes" apenas quando vazios, exceto os 4 novos casos acima (Número do pedido é sempre pedido; Vendedor sempre mostrado com a regra de trava; Cliente sempre visível; WhatsApp condicional ao vendedor selecionado).

### 2. Espelho dentro de `/modelos`

Substituir o redirecionamento para `/pedido` ou `/pedido-cinto` por um segundo Dialog empilhado sobre o modal atual:

- Ao clicar **"Conferir e finalizar"**, o modal de identificação permanece montado (com os valores digitados) e abre-se um Dialog do Espelho por cima.
- O Espelho reutiliza o mesmo componente/markup já usado em `OrderPage` / `BeltOrderPage` (extrair para `src/components/orders/EspelhoFichaDialog.tsx` recebendo `orderPreview`, `onEditar`, `onConfirmar`).
- Botões:
  - **Editar** → fecha só o espelho, volta para o modal de identificação com os dados intactos.
  - **OK, finalizar** → chama helper `createBotaOrder` / `createCintoOrder` (extraídos do submit existente do OrderPage/BeltOrderPage, sem alterar regras de preço/atribuição/notificação). Se grade, usa `addOrderBatch`.
- Após sucesso: toast "Pedido criado", fecha ambos os dialogs, mantém usuário em `/modelos`. Não navega. Grade de cards continua visível pronta para próximo "Comprar". Remover o state `comprarMode` de OrderPage/BeltOrderPage adicionado antes (não é mais usado).

### 3. Detalhes técnicos

- `ModelosPage.tsx`: adicionar states `vNumeroPedido`, `vVendedor` (com default = nome do usuário quando não-admin), lista de vendedores idem OrderPage, computação `showWhatsapp = ['Juliana Cristina Ribeiro','Rancho Chique'].includes(vVendedor)`, `clienteObrigatorio = vVendedor === 'Juliana Cristina Ribeiro'`, `tamanhosDoModelo = template.tamanhos_skus?.map(t => t.tamanho) ?? TAMANHOS`.
- Extrair de `src/pages/OrderPage.tsx` uma função pura `createBotaOrder({ template, overrides, gradeItems, user, ... })` e de `src/pages/BeltOrderPage.tsx` `createCintoOrder(...)`. Elas encapsulam: merge de `form_data` + overrides, validações mínimas restantes, resolução de preço via cache existente, chamada a `addOrder` / `addOrderBatch`, notificações e atribuição. Sem alterações de regra.
- `EspelhoFichaDialog`: renderiza a mesma tabela de composição/identificação/couros/bordados/... hoje inline no espelho. Recebe já o objeto de "pedido preview" montado pelos helpers acima (novo utilitário `buildOrderPreview(template, overrides)`).
- Remover em `OrderPage.tsx` / `BeltOrderPage.tsx` a lógica `comprarMode` que escondia o form e abria o espelho automático — não é mais necessária.
- `Header.tsx` e rota `/modelos` permanecem como estão.
- Migração do `tipo` já aplicada anteriormente permanece.

### 4. Fora de escopo

- Não altera preço, comissão, notificações, PDF, atribuição, RLS.
- Não altera criação/edição de modelos em OrderPage/BeltOrderPage.
- Não altera fluxo direto de "Faça seu pedido".
