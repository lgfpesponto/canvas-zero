# Botão "Ver produtos" com erro/pendência de sincronização Bagy

## Contexto (confirmado)

Hoje, na página **Estoque**, ao lado do botão `Sincronizar com Bagy (N)` (componente `BagySyncPendingButton`), o contador `N` diz *quantos* produtos estão pendentes/com erro, mas para descobrir **quais** o usuário precisa abrir card por card. Os produtos ficam marcados em `estoque_produtos` via `bagy_sync_status` (`pendente | erro | nao_encontrado_na_bagy | null`) e o motivo do erro fica em `bagy_last_sync_error` (já usado hoje).

## O que fazer

Adicionar um botão `Ver produtos` imediatamente ao lado de `Sincronizar com Bagy (N)`, que abre um diálogo listando exatamente os mesmos produtos que compõem o contador.

### Diálogo "Produtos com problema na Bagy"

Tabela simples, uma linha por produto:

| Coluna | Origem |
|---|---|
| Nome do produto | `estoque_produtos.nome` |
| SKU base | `sku_base` |
| Status | badge colorido a partir de `bagy_sync_status` (Pendente / Erro / Não encontrado na Bagy / Nunca sincronizado) |
| Último erro | `bagy_last_sync_error` (truncado com tooltip completo) |
| Última tentativa | `bagy_sync_at` formatado pt-BR (ou "—") |
| Ação | link/botão "Abrir" que navega para o produto no Estoque (fecha diálogo + rola até o card, reusando lógica de filtro por SKU/ID que já existe) |

Extras do diálogo:
- Campo de busca por nome/SKU no topo.
- Contador "X produtos" no cabeçalho.
- Botão `Sincronizar agora` no rodapé que dispara a mesma ação do botão externo (conveniência) e mantém o diálogo aberto atualizando a lista via realtime que já existe.
- Realtime: reaproveitar a subscription de `estoque_produtos` já usada por `BagySyncPendingButton` para que a lista se atualize sozinha conforme itens saem do estado de erro.

### Detalhes técnicos

- Novo componente `src/components/estoque/BagySyncErrorsDialog.tsx`.
- Alterar `BagySyncPendingButton.tsx`:
  - Buscar também a **lista** (não só o count) quando `pendentes > 0`, com `select('id,nome,sku_base,bagy_sync_status,bagy_sync_at,bagy_last_sync_error')` e o mesmo filtro `.or(...)` já existente.
  - Renderizar novo botão `<Button variant="outline" size="sm">Ver produtos</Button>` ao lado do atual, que abre o diálogo.
- Sem alterações de schema, RLS ou edge functions — todos os campos já existem e já são lidos pelo usuário com permissão `canSync`.
- Sem mudar visibilidade: aparece apenas para quem já vê o botão de sincronizar (admin_master, admin_producao, vendedor_comissao).

## Fora do escopo

- Não mexer no botão de sincronização em si, no `BagySyncStatusCard` da aba Gestão, nem no fluxo da edge function `bagy-stock-sync`.
- Não expor o token Bagy nem detalhes de autenticação no diálogo (mostra só a mensagem crua já salva em `bagy_last_sync_error`, que é o que o usuário precisa para agir).
