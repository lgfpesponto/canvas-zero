## Novo perfil de usuário: "bordado"

Objetivo: criar um modo de portal exclusivo para o time de bordado (Neto e Débora). Eles só enxergam pedidos nas etapas "Entrada Bordado 7Estrivos" e "Baixa Bordado 7Estrivos", sem preços, sem filtros, sem outras páginas. A função principal é dar baixa de entrada/saída via leitura de código de barras (ou número do pedido) e gerar um PDF resumindo o que foi baixado para "Baixa Bordado 7Estrivos" no dia.

### 1. Banco de dados (migration)

- Adicionar valor ao enum `app_role`:
  ```sql
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'bordado';
  ```
- Criar/usuários: criar contas para Neto e Débora via UI de Usuários (admin_master) usando o novo papel.
- Atualizar RLS de `orders` para o papel `bordado`:
  - SELECT: permitido apenas quando `status IN ('Entrada Bordado 7Estrivos','Baixa Bordado 7Estrivos')`. (Política dedicada usando `has_role(auth.uid(),'bordado')`.)
  - UPDATE: permitido apenas se status atual for um desses dois e o novo status também for um deles (aceitar transição Entrada→Baixa). Como UPDATE policy não vê `NEW`, restringimos pelo `USING` (status atual ∈ {Entrada,Baixa}); a transição correta é garantida na função RPC abaixo.
- Criar RPC `bordado_baixar_pedido(_order_id uuid, _novo_status text)` (SECURITY DEFINER) que:
  - Exige `has_role(auth.uid(),'bordado')` ou admin_master.
  - Valida `_novo_status IN ('Entrada Bordado 7Estrivos','Baixa Bordado 7Estrivos')`.
  - Atualiza `orders.status` e adiciona entrada em `historico` (data/hora Brasília, usuário = nome_completo).
- (Opcional) Política RLS em `profiles`/`user_roles` já cobre leitura própria.

### 2. AppRole no front

- `src/contexts/AuthContext.tsx`: adicionar `'bordado'` à união `AppRole`.
- `src/lib/order-logic.ts`: nada muda (não é admin).

### 3. Tela exclusiva: `/bordado`

Criar `src/pages/BordadoPortalPage.tsx`:
- Lista somente pedidos com status `Entrada Bordado 7Estrivos` ou `Baixa Bordado 7Estrivos`.
- Card minimalista por pedido: número, modelo, vendedor (sem preço, sem composição financeira).
- Botão grande "Escanear / Buscar pedido" abre o mesmo modal de scanner já usado em `ReportsPage` (input que aceita código de barras OU número do pedido). Usa `fetchOrderByScan` / `matchOrderBarcode`.
- Ao escanear, abre uma tela de confirmação com: número, modelo, status atual, e dois botões:
  - "Marcar Entrada Bordado" (se status ≠ Entrada)
  - "Marcar Baixa Bordado" (se status = Entrada)
  - Chama RPC `bordado_baixar_pedido`.
- Botão "Ver pedido": abre `/pedido/:id` em modo restrito.
- Botão "PDF resumo do dia": gera PDF dos pedidos que mudaram para "Baixa Bordado 7Estrivos" hoje (ver §5).

### 4. OrderDetailPage em modo bordado

- Detectar `role === 'bordado'` em `src/pages/OrderDetailPage.tsx`:
  - Esconder seções de preço, composição, financeiro, histórico financeiro, edição, exclusão, conferido, fotos opcionais (manter foto principal).
  - Mostrar apenas: número, código de barras, modelo/cor/tamanho, vendedor, status, observações, e os dois botões de baixa (Entrada/Baixa Bordado).
  - Manter botão "Buscar pedido" (mesmo scanner) no topo.

### 5. Roteamento e Header

- `src/App.tsx`: adicionar rota `/bordado` → `BordadoPortalPage`.
- `ChromeWrapper`: para `role === 'bordado'`, esconder `Header`, `DeployNoticeBanner`, `AdminAssistantFab` (ou mostrar header mínimo só com logo + sair). Plano: header minimal próprio dentro de `BordadoPortalPage`/`OrderDetailPage`.
- `src/pages/Index.tsx`: se `role === 'bordado'`, `<Navigate to="/bordado" replace />`.
- Bloquear navegação para outras rotas: em cada página principal (`OrderPage`, `ReportsPage`, `ExtrasPage`, `FinanceiroPage`, etc.), redirecionar para `/bordado` se role for bordado. Mais simples: criar guard `useRoleGuard` ou tratar centralmente em `ChromeWrapper` (whitelist `/bordado` e `/pedido/:id`).

### 6. PDF "Resumo do dia"

- Função em `src/lib/pdfGenerators.ts`: `generateBordadoBaixaResumoPDF(orders, dataRef)`.
- Lista de pedidos baixados para "Baixa Bordado 7Estrivos" na data selecionada (default = hoje, Brasília).
- Reusa a RPC existente `find_orders_by_status_change(_status, _de, _ate)` com `_status = ARRAY['Baixa Bordado 7Estrivos']` e `_de = _ate = hoje`.
- Layout simples A4: cabeçalho "Resumo Baixa Bordado 7Estrivos — DD/MM/AAAA", tabela com Nº, Modelo, Vendedor, Hora da baixa (lida do `historico`).

### 7. Memória do projeto

Adicionar memory `mem://auth/role-bordado` descrevendo regras (acesso restrito, status visíveis, RPC) e atualizar Core para citar o novo papel.

### Arquivos a criar/editar

- nova migration SQL (enum + RLS + RPC)
- `src/contexts/AuthContext.tsx` (AppRole)
- `src/App.tsx` (rota + ChromeWrapper guard)
- `src/pages/Index.tsx` (redirect bordado)
- `src/pages/BordadoPortalPage.tsx` (novo)
- `src/pages/OrderDetailPage.tsx` (modo bordado)
- `src/lib/pdfGenerators.ts` (novo PDF)
- `src/pages/UsersManagementPage.tsx` (oferecer role 'bordado' no select)
- nova memória

Ao aprovar, implemento tudo nesta ordem: migration → AppRole/guard → BordadoPortalPage + scanner + RPC → OrderDetailPage modo bordado → PDF → atualizar Users management → memória.
