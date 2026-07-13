
## 1. Botão "Estoque Pronto" nos pedidos de vendedor = Estoque

Locais: `src/pages/OrderPage.tsx` (bota) e `src/pages/BeltOrderPage.tsx` (cinto).

- Quando `vendedorSelecionado === 'Estoque'`, aparece um botão "Estoque Pronto" ao lado do submit.
- Marca uma flag interna `estoquePronto` no payload. Ao salvar:
  - Cria o pedido normalmente **mas** já com `status = 'Baixa Estoque'` e `estoque_pronto = true`.
  - Chama `criar_estoque_produto` imediatamente após o insert (mesma lógica de agregar por SKU já existe — soma quantidade no tamanho, não sobrescreve nome/foto).
  - Após conferir/finalizar, o botão de submit muda o rótulo para "Criar Estoque" e, ao concluir, redireciona para `/estoque` (não vai para `/meus-pedidos`).
- Pedidos com `estoque_pronto = true` são **ocultados** de todas as listagens de pedidos (Meus Pedidos, Relatórios, Dashboard, Comissão, Cobrança, Bordado/Montagem etc.) via filtro central em `useOrders`/`useOrdersQuery` e no lado do servidor onde aplicável. Ficam acessíveis apenas via link direto/estoque para auditoria.

Migration: `ALTER TABLE public.orders ADD COLUMN estoque_pronto boolean NOT NULL DEFAULT false;` + índice.

## 2. SKU já existente = somar ao produto atual

`criar_estoque_produto` (Postgres RPC): ajustar para, quando encontrar linha em `estoque_produtos` com mesmo `sku` + `tamanho`, apenas **incrementar `quantidade`** e **manter nome/foto/preço atuais**. Só cria novo registro se combinação SKU+tamanho não existir. Vale tanto para "Estoque Pronto" quanto para o fluxo atual de Baixa Estoque.

## 3. Ajuste manual de estoque (admin_producao / admin_master)

Em `src/pages/EstoquePage.tsx`, ícone de engrenagem por linha abrindo diálogo com:
- Nome/foto/SKU/preço editáveis.
- Botões "+1 / −1" e input livre para ajustar `quantidade` diretamente.
- Registro em log simples (`estoque_ajustes_log`: produto_id, delta, motivo opcional, user_id, timestamp).
Visível/acionável **só** para `admin_master` e `admin_producao`.

## 4. Empréstimos ("Adicionar emprestado")

Nova tabela `estoque_emprestimos`:
- `produto_id` (FK), `tamanho`, `quantidade`, `vendedor_id`, `vendedor_nome`, `status` ('ativo'|'devolvido'), `criado_por`, timestamps.
- GRANTs + RLS: SELECT liberado para authenticated (todos veem); INSERT/UPDATE só para admin_master/admin_producao (via `has_role`); vendedor consegue ver os próprios via mesma policy de SELECT.

UI em `EstoquePage.tsx`:
- Botão "Adicionar emprestado" (topo esquerdo, acima da busca) — só admin_master/admin_producao — abre diálogo com: select vendedor, busca de produtos, seleção múltipla de produto+tamanho+quantidade, salvar.
- Novo painel "Emprestados" listando ativos com botão "Devolvido" (marca `status='devolvido'`). Não mexe em `quantidade` do estoque.
- Ao clicar em "Comprar" (`EstoqueBuyDialog`), se houver empréstimo ativo daquele produto+tamanho, mostrar aviso "Está com o vendedor X (qtd Y)".
- Para o vendedor logado que possui empréstimos, badge/card fixo no topo esquerdo da `EstoquePage` listando seus itens (somente leitura).

## 5. Botão "Criar estoque" no scanner de código de barras

Em `src/pages/RanchoChiquePedidosPage.tsx` (ou onde vive o dock de barcode/mudar progresso — verificar em Meus Pedidos): quando **todos** os pedidos escaneados forem `vendedor === 'Estoque'` e `status === 'Baixa Estoque'`, mostrar botão "Criar Estoque" ao lado de "Mudar Progresso". Ao clicar, chama `criarEstoqueEmMassa` já existente e exibe progresso.

## 6. Sincronização manual Bagy pós-entrada de estoque

Nova tabela `estoque_bagy_sync_pendente` (produto_id, criado_em, sincronizado_por, sincronizado_em). Trigger em `estoque_produtos` na criação/incremento de quantidade insere/atualiza pendente.

- Botão "Sincronizar com Bagy" no topo da `EstoquePage`, visível para admin_master, admin_producao, vendedor_comissao — aparece **só quando existirem pendentes**.
- Ao clicar: invoca edge function nova `bagy-stock-sync-manual` que percorre pendentes, envia push só desses SKUs e marca como sincronizados (some para todos os usuários — realtime na tabela).

## 7. Backfill de SKU em pedidos "Estoque" existentes

Migration data-fix (rodar 1x): para todos os `orders` com `vendedor='Estoque'` e `sku_estoque IS NULL`:
- Agrupar por `numero` (grade); gerar `skuBase = slugify(modelo)` e aplicar `<base>-<tamanho>` a todos da grade. Deixar `nome_produto_estoque` em branco.
- Em `CompletarSkusBulkPanel.tsx`, incluir botão "Preencher na grade" ao lado do campo Nome: replica o nome digitado para todos os pedidos com o mesmo `numero`.

## 8. Prioridade Estoque nos imports Bagy

Em `supabase/functions/bagy-webhook/index.ts` (fluxo de match por SKU):
- **Ordem obrigatória**: (1) procurar `estoque_produtos` com mesmo SKU **e** `quantidade > 0`; se achar, criar pedido já baixando do estoque (fluxo atual). (2) Só se não houver, tentar match em modelos do Rancho Chique → gerar ficha. (3) Se nada bater, cai no fluxo genérico atual.
- Ajustar helpers e mensagens do painel `BagyFichaDialog` para refletir a nova prioridade.

## Detalhes técnicos

- **Novas tabelas**: `estoque_emprestimos`, `estoque_bagy_sync_pendente`, `estoque_ajustes_log`. Cada uma com GRANTs completos + RLS + updated_at trigger (padrão do projeto).
- **Nova coluna**: `orders.estoque_pronto boolean default false`.
- **RPC alterada**: `criar_estoque_produto` — soma em SKU+tamanho existente ao invés de duplicar.
- **Nova edge function**: `bagy-stock-sync-manual` (verify_jwt=false + validação de role via JWT interno).
- **Realtime**: adicionar `estoque_emprestimos` e `estoque_bagy_sync_pendente` ao publication `supabase_realtime`.
- **Filtros de listagem**: centralizar `estoque_pronto = false` em `useOrdersQuery` e `useOrders` para não vazar em nenhuma tela.
- **Sem mudanças** em: PDFs de produção, cálculo de preço, comissão, permissões existentes (só adiciona restrições novas nos botões admin).

## Fora do escopo (confirmar se quiser incluir)

- Interface para editar/estornar itens do log de ajuste manual.
- Notificação push quando empréstimo é devolvido.
