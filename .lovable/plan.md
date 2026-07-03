## Objetivo
Reorganizar visualmente as páginas "Faça seu Pedido" (bota e cinto): novo botão Limpar no topo, botões flutuantes de finalizar/rascunho junto da foto, mover Observação para IDENTIFICAÇÃO, e dividir "Desenvolvimento" em 3 campos separados por categoria (Bordado R$50, Laser R$100, Estampa R$150), cada um como tem/não tem com descrição opcional.

## 1) Botão "Limpar" (bota e cinto)
No cabeçalho, antes de "Criar Modelo" e "Modelos", adicionar botão **Limpar** (variante outline com ícone de vassoura/eraser).

- Ao clicar: pedir confirmação (`window.confirm`) e resetar TODOS os states do formulário para o padrão inicial — reaproveitando o mesmo bloco que já existe após submit bem-sucedido em OrderPage (`setModelo('')`, `setDesenvolvimento('')`, etc., linhas ~1030-1100). Extrair essa lógica em uma função `resetForm()` já usada tanto pelo submit quanto pelo botão Limpar.
- Não limpa: vendedor, número do pedido gerado, foto (mantém visível se estiver aberta). Opcional: também limpar. **Assumindo limpar tudo do formulário exceto vendedor logado.**

## 2) Botões flutuantes junto da foto
No `FotoPedidoSidePanel`, adicionar dois botões flutuantes empilhados logo abaixo do painel da foto, dentro do mesmo `aside` sticky (portanto acompanham a rolagem):

- **Olhinho (Eye)** — dispara o mesmo caminho que "Conferir e finalizar pedido" (chama `handleSubmit` do form, que abre a tela de confirmação).
- **Página (FileText)** — dispara `handleSaveDraft`.

Implementação: `FotoPedidoSidePanel` recebe duas novas props opcionais `onFinalizar?` e `onSaveDraft?`. Renderizadas como botões redondos grandes (56px), ícone lucide, `title` com tooltip, empilhados verticalmente abaixo da foto (não fixed — sticky junto do `aside` que já é sticky). Desabilita quando `orderDuplicate === true`.

Passar callbacks a partir de OrderPage e BeltOrderPage.

## 3) Observação dentro de IDENTIFICAÇÃO
Mover o `<Section title="Observação">` (textarea `observacao`) para dentro da seção IDENTIFICAÇÃO, ocupando a posição onde hoje fica o campo "Desenvolvimento" (linha ~1585 em OrderPage.tsx). O bloco "Observação" separado no final é removido.

Aplicar mesma mudança em BeltOrderPage (mover textarea para dentro da seção de identificação do cinto).

## 4) Dividir Desenvolvimento em 3 campos por categoria (apenas bota)

### Modelo de dados — sem migração de schema
- Coluna `desenvolvimento` (text) permanece intocada — usada só para **compatibilidade retroativa** (pedidos antigos continuam exibindo/somando "Desenvolvimento: Bordado/Laser/Estampa" via lógica atual).
- Novos campos vão em `extra_detalhes` (jsonb) já existente:
  - `desenvBordado: boolean`, `desenvBordadoDesc: string`
  - `desenvLaser: boolean`, `desenvLaserDesc: string`
  - `desenvEstampa: boolean`, `desenvEstampaDesc: string`
- Em pedidos **novos**, `desenvolvimento` fica vazio ('') e os 3 booleans mandam. Pedidos **antigos** que já têm `desenvolvimento` preenchido continuam funcionando pelo caminho legacy.

### Preços (na composição do pedido)
Em `src/lib/recomputeOrderPrice.ts` (~linha 66): manter push de `DESENVOLVIMENTO.find(...)` **apenas quando** os 3 booleans estão ausentes (pedido legacy). Se houver qualquer um dos 3 novos, somar:
- Bordado: +50
- Laser: +100
- Estampa: +150

Aplicar mesma lógica no cálculo local do OrderPage.tsx (`desenvPreco`, linha 857) e em qualquer item de composição (`items.push` linha ~1220 e ~1287).

### UI (OrderPage.tsx)
- Remover o `SelectField label="Desenvolvimento"` da seção IDENTIFICAÇÃO (linha ~1585).
- Em **BORDADOS**: adicionar toggle "Desenvolvimento (+R$50)" tem/não tem; se "tem", abrir input de texto para descrição.
- Em **LASER E RECORTES**: idem, "Desenvolvimento (+R$100)".
- Em **ESTAMPA**: idem, "Desenvolvimento (+R$150)".
- Padrão visual: mesmo dos toggles existentes tipo `pintura`, `estampa`, `trice` (Select "tem/não tem" + textarea condicional).

### PDF e Ficha (impressos e detalhe)
- `src/lib/pdfGenerators.ts` (~linha 342): manter o "Desenv." em IDENTIFICAÇÃO **só** se `order.desenvolvimento` (legacy) estiver preenchido E não houver novos campos. Novos aparecem nas próprias categorias:
  - BORDADOS: linha "Desenvolvimento: <desc>" após os bordados existentes.
  - LASER E RECORTES: linha "Desenvolvimento: <desc>".
  - ESTAMPA: linha "Desenvolvimento: <desc>".
- Mesma mudança em `src/lib/orderFichaCategories.ts` (buildBootFichaCategories) para o detalhe da tela.

### Ordem/atribuição
- `src/lib/order-logic.ts` `dbRowToOrder` e `orderToDbRow`: mapear os 3 novos campos via `extra_detalhes` (nada muda no schema SQL).
- `checkSingle('desenvolvimento', ...)` no OrderPage (linha 630) removido (não é mais SelectField).

## 5) BeltOrderPage
- Botão Limpar e botões flutuantes (itens 1 e 2): sim, iguais.
- Observação dentro de identificação (item 3): sim.
- Item 4 (desenvolvimento em 3 categorias): **não se aplica** — cinto não tem Bordado/Laser/Estampa com desenvolvimento; segue com `desenvolvimento: '-'`.

## Fora de escopo
- EditOrderPage/EditBeltPage/EditExtrasPage: **não** ganham UI de desenvolvimento 3-em-1 nesta rodada (pedidos antigos continuam editáveis com o campo legacy). Se a Juliana quiser editar novos pedidos com essa granularidade, tratamos em plano separado.
- Migração de banco: nenhuma.
- Recalcular retroativamente valores de pedidos antigos: nenhum.

## Detalhes técnicos
- Arquivos alterados: `src/pages/OrderPage.tsx`, `src/pages/BeltOrderPage.tsx`, `src/components/FotoPedidoSidePanel.tsx`, `src/lib/recomputeOrderPrice.ts`, `src/lib/pdfGenerators.ts`, `src/lib/orderFichaCategories.ts`, `src/lib/order-logic.ts` (mapeamento extra_detalhes).
- Botões flutuantes: `sticky` dentro do `aside` já sticky do painel; wrapper com `mt-3 flex flex-col gap-2 items-end`.
- Toggles de desenvolvimento: reutilizar o padrão dos campos "tem/não tem" já usados (Select `Sim`/`Não` + textarea condicional).
