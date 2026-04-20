

## Aba Financeiro (exclusiva para usuário 7estrivos / Juliana)

Nova aba no menu, visível só para `admin_master`, com duas seções: **A Receber** (comprovantes que vendedoras enviam) e **A Pagar** (notas para o CNPJ da empresa).

## Estrutura

### 1. Banco de dados (migration)

**Tabela `financeiro_a_receber`** — comprovantes recebidos
- `id` uuid PK
- `vendedor` text (quem mandou — selecionado da lista de vendedores existentes)
- `data_pagamento` date
- `valor` numeric
- `destinatario` text (para quem foi: "Empresa" ou nome do fornecedor)
- `tipo` text ("empresa" | "fornecedor") — pra filtrar/identificar
- `descricao` text (opcional)
- `comprovante_url` text (PDF no Storage)
- `created_at`, `created_by` (uuid do user que cadastrou)

**Tabela `financeiro_a_pagar`** — notas/contas do CNPJ
- `id` uuid PK
- `fornecedor` text
- `numero_nota` text
- `data_emissao` date
- `data_vencimento` date
- `valor` numeric
- `status` text ("em_aberto" | "pago")
- `data_pagamento` date (preenchida quando marca como pago)
- `nota_url` text (PDF no Storage)
- `descricao` text (opcional)
- `created_at`, `created_by`

**RLS:** Ambas tabelas — só `admin_master` pode SELECT/INSERT/UPDATE/DELETE (usar função `has_role(auth.uid(), 'admin_master')`).

**Storage bucket `financeiro`** (privado)
- Pastas: `a-receber/` e `a-pagar/`
- RLS: só admin_master lê/escreve
- PDFs servidos via signed URLs (1h)

### 2. Rota e navegação

- Nova rota `/financeiro` em `App.tsx` → componente `FinanceiroPage`
- Item "FINANCEIRO" no `Header.tsx`, condicional a `role === 'admin_master'`
- Página redireciona pra `/` se quem acessar não for admin_master

### 3. UI (`src/pages/FinanceiroPage.tsx`)

Layout com `Tabs` (shadcn) — duas abas: **A Receber** | **A Pagar**.

**Aba A Receber:**
- Botão "Registrar Recebimento" abre Dialog com formulário:
  - Vendedor (Select com lista de vendedores existentes nos `orders`, mesma lógica usada no AdminDashboard)
  - Tipo (Radio: "Para a Empresa" | "Para Fornecedor")
  - Destinatário (texto livre — se "Fornecedor", obrigatório; se "Empresa", auto-preenche "Empresa")
  - Data do pagamento (date picker)
  - Valor (R$)
  - Descrição (opcional)
  - Upload de comprovante (PDF, obrigatório, max 5MB)
- Tabela listando todos os recebimentos: Vendedor | Data | Valor | Destinatário | Tipo (badge) | PDF (botão "Ver") | Ações (excluir)
- Filtros: período (mês atual / últimos 30d / customizado), vendedor, tipo
- Card resumo no topo: Total recebido no período, total pra empresa, total pra fornecedores

**Aba A Pagar:**
- Botão "Lançar Nota" abre Dialog com formulário:
  - Fornecedor (texto)
  - Número da nota (texto)
  - Data de emissão
  - Data de vencimento
  - Valor (R$)
  - Descrição (opcional)
  - Upload da nota (PDF, opcional)
- Tabela: Fornecedor | Nº Nota | Emissão | Vencimento | Valor | Status (badge verde/vermelho) | Nota (botão Ver) | Ações (marcar como pago, excluir)
- Ação "Marcar como pago" abre mini-dialog perguntando data de pagamento
- Filtros: status (todos / em aberto / pagos), período de vencimento, fornecedor
- Cards resumo: Total a pagar (em aberto), Total pago no mês, Vencendo nos próximos 7 dias (alerta vermelho se houver)

### 4. Comportamentos

- **Upload de PDF**: validação client-side (tipo `application/pdf`, tamanho ≤ 5MB), nome único `{uuid}.pdf` no bucket
- **Visualizar PDF**: gera signed URL (`createSignedUrl`, 3600s) e abre em nova aba
- **Excluir registro**: confirma com AlertDialog, remove arquivo do Storage junto
- **Moeda**: usar `formatCurrency` de `@/lib/order-logic`
- **Datas**: input nativo `type="date"`, formatação BR na exibição

## O que NÃO mexo

- Pedidos, dashboard, vendedores existentes — zero impacto
- Outras roles continuam sem ver nada de financeiro
- Estrutura do Supabase atual (só adiciona, não altera)

## Ordem de execução

1. Migration: 2 tabelas + RLS + bucket + policies do storage
2. `FinanceiroPage.tsx` com as duas abas
3. Componentes: `FinanceiroAReceber.tsx`, `FinanceiroAPagar.tsx`, dialogs de cadastro
4. Rota em `App.tsx`
5. Item no `Header.tsx` (condicional admin_master)

## Validação (você faz depois)

1. Logar como Juliana (7estrivos) → ver "FINANCEIRO" no menu
2. Cadastrar um recebimento com PDF de teste → conferir que aparece na lista e o PDF abre
3. Lançar uma nota a pagar → marcar como paga → conferir mudança de status
4. Logar como Fernanda ou vendedor → confirmar que a aba **não** aparece e `/financeiro` redireciona

