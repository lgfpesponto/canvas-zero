## 1) Botão "Criar produto" no scanner (vendedor Estoque + Baixa Estoque)

Em `src/pages/ReportsPage.tsx`, dentro do overlay do scanner (bloco `hasSelection`, próximo aos botões "Mudar progresso de produção" / "Limpar seleção"):

- Derivar `estoqueBaixaSelecionados` a partir de `selectedScannedList`, filtrando pedidos cujo vendedor é `Estoque` (pseudo-vendedor interno) **e** `status === 'Baixa Estoque'`.
- Se `estoqueBaixaSelecionados.length > 0`, exibir um terceiro botão **"Criar produto (N)"** ao lado dos existentes.
- Ao clicar:
  - Confirmar via `window.confirm` ("Criar produto no estoque para N pedidos escaneados?").
  - Chamar `criarEstoqueEmMassa(estoqueBaixaSelecionados, onProgress)` de `src/lib/criarEstoqueBulk.ts`.
  - Mostrar toast com progresso `X/Y` durante a execução (mesmo padrão de bulk progress usado hoje).
  - No final, toast de sucesso/erros e refetch da lista; manter os pedidos com falha selecionados.
- Regra: cada pedido precisa já ter `sku_estoque` + `nome_produto_estoque` preenchidos (a RPC `criar_estoque_produto` valida). Erros por falta desses campos aparecem no toast; nada é criado automaticamente.
- Nada muda no `EstoqueAdminPanel` individual — este é apenas o atalho em massa via scanner.

## 2) Popup de edição de campo (modo edição de ficha) maior + busca

Alvo: `src/components/ficha-edit/FichaFieldControls.tsx` (o Popover mostrado na segunda imagem, com "Nome do campo" e "Variações (76)").

Mudanças (apenas UI/apresentação):
- Trocar `PopoverContent className="w-80 max-h-[70vh]"` por um contêiner bem maior: `w-[560px] max-w-[95vw] max-h-[85vh]` e usar layout em coluna com a lista de variações ocupando o espaço restante (`flex flex-col`, área de variações com `flex-1 min-h-0 overflow-y-auto`).
- Aumentar altura interna da lista de variações (remover `max-h-64`, deixar a rolagem no contêiner principal).
- Adicionar `<Input>` "Buscar variação…" acima da lista, com estado local `varSearch`. Filtra `variacoes` e `drafts` por `nome.toLowerCase().includes(query)`. Contador "(N)" continua mostrando o total real; abaixo mostra "N de M" quando há busca ativa.
- Inputs internos (nome/preço/foto) crescem: `h-8`/`text-xs`, largura do preço `w-20`, botão "ok" `h-8 px-3`.
- Comportamento, salvamento e regras existentes ficam iguais — só muda tamanho e busca.

## 3) Página "Modelos" liberada para admin_producao

Em `src/pages/ModelosPage.tsx`:
- Remover `admin_producao` do bloqueio da linha 339 → passa a ser `if (role === 'bordado' || role === 'montagem') return <Navigate to="/" replace />;`.
- Manter o restante do gating que já existe (ex.: `isVendedorComum`, grade de estoque, botões de compra) inalterado — `admin_producao` continua sem poder comprar/gerar pedido, apenas navegar e visualizar os modelos (incluindo os que Fernanda/Mariana cadastraram).
- Verificar `src/App.tsx` para garantir que a rota `/modelos` não está bloqueada para `admin_producao` em outro nível; se estiver, liberar também.

Interpretação de "com os modelos criados por elas": mostrar todos os modelos (a lista já inclui os cadastrados por qualquer admin). Se depois quisermos filtrar só os criados pela própria usuária, é outra tarefa.

## Fora de escopo
- Não alterar regra de status/permissão de "Baixa Estoque".
- Não mudar `criar_estoque_produto` no banco.
- Não mudar layout do editor de ficha fora do popover de campo.
