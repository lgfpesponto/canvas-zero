
# Plano — Saldo do Revendedor + Baixa Automática em "Cobrado"

> **Escopo restrito**: somente o módulo Financeiro. Nada do sistema de pedidos, fichas, relatórios, dashboards, comissão ou produção é alterado. A coluna `status` da tabela `orders` continua intocada — a baixa por saldo é registrada em **tabelas paralelas novas**, sem mexer no fluxo atual de "Cobrado → Pago" feito pelos admins.
> 
> **Visibilidade controlada**: apenas `admin_master` (Juliana / login `7estrivos`) e a vendedora **Stefany** (`stefany`, role `vendedor`) enxergam a nova aba. Todos os outros revendedores continuam sem acesso ao Financeiro.

---

## Parte 1 — Modelo de dados (migrations)

Quatro tabelas novas. Nada existente é alterado.

### 1.1 `revendedor_saldo_movimentos`
Toda entrada e saída de dinheiro do revendedor passa por essa tabela — fonte única de verdade do saldo.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | |
| `vendedor` | text | Nome do revendedor (mesmo padrão da `orders.vendedor`) |
| `tipo` | text CHECK in (`'entrada_comprovante'`, `'baixa_pedido'`, `'ajuste_admin'`, `'estorno'`) | |
| `valor` | numeric | Sempre positivo. Sinal vem do `tipo` (entrada soma, baixa/estorno subtraem) |
| `descricao` | text | Livre (motivo do ajuste, etc.) |
| `comprovante_id` | uuid NULL | FK lógico p/ `revendedor_comprovantes` quando `tipo='entrada_comprovante'` |
| `order_id` | uuid NULL | FK lógico p/ `orders` quando `tipo='baixa_pedido'` |
| `saldo_anterior` | numeric | Snapshot p/ auditoria |
| `saldo_posterior` | numeric | Snapshot p/ auditoria |
| `created_by` | uuid | `auth.uid()` de quem gerou o lançamento |
| `created_at` | timestamptz default now() | |

Índices: `(vendedor, created_at desc)`, `(order_id)`, `(comprovante_id)`.

### 1.2 `revendedor_comprovantes`
Comprovantes enviados pelo revendedor, aguardando aprovação.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | |
| `vendedor` | text | |
| `valor` | numeric | Valor declarado pelo revendedor |
| `data_pagamento` | date | |
| `observacao` | text NULL | |
| `comprovante_url` | text | path no bucket `financeiro/revendedor-saldo/...` |
| `comprovante_hash` | text | SHA-256 (anti-duplicata, igual à lógica atual de `checkDuplicates`) |
| `status` | text CHECK in (`'pendente'`, `'aprovado'`, `'reprovado'`) default `'pendente'` | |
| `motivo_reprovacao` | text NULL | |
| `enviado_por` | uuid | `auth.uid()` do revendedor |
| `aprovado_por` | uuid NULL | `auth.uid()` do admin |
| `aprovado_em` | timestamptz NULL | |
| `created_at` | timestamptz default now() | |

Quando aprovado, o sistema cria automaticamente uma linha `entrada_comprovante` em `revendedor_saldo_movimentos` e dispara a tentativa de baixa nos pedidos pendentes (Parte 4).

### 1.3 `revendedor_baixas_pedido`
Registro 1:1 das baixas integrais — um pedido só pode aparecer aqui uma única vez (constraint `UNIQUE(order_id)`).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | |
| `order_id` | uuid UNIQUE | FK lógico para `orders.id` |
| `vendedor` | text | snapshot na hora da baixa |
| `valor_pedido` | numeric | snapshot de `preco * quantidade` |
| `movimento_id` | uuid | FK p/ `revendedor_saldo_movimentos` (a linha de saída de saldo) |
| `created_at` | timestamptz default now() | |

A presença de uma linha aqui é o que indica **"pedido pago via saldo do revendedor"** — nunca alteramos `orders.status`.

### 1.4 `revendedor_saldo_visibilidade`
Lista de revendedores com acesso ao novo módulo (controle de visibilidade enquanto está em teste).

| Coluna | Tipo |
|---|---|
| `id` | uuid PK |
| `vendedor` | text UNIQUE |
| `ativo` | boolean default true |
| `created_at` | timestamptz |

Seed inicial: `INSERT INTO revendedor_saldo_visibilidade (vendedor) VALUES ('stefany ribeiro feliciano');` — Stefany será a única revendedora liberada na fase de teste.

### 1.5 RLS — políticas

Todas as tabelas com RLS habilitado.

- **`revendedor_saldo_movimentos`**:
  - SELECT: `is_any_admin(auth.uid())` OU `vendedor = (SELECT nome_completo FROM profiles WHERE id = auth.uid())`
  - INSERT/UPDATE: apenas `admin_master` (todas as inserções vêm de fluxo controlado)
  - DELETE: bloqueado (auditoria imutável)
- **`revendedor_comprovantes`**:
  - SELECT: admin OU `enviado_por = auth.uid()` OU `vendedor = nome_completo do auth.uid()`
  - INSERT: o próprio revendedor (`enviado_por = auth.uid()` AND `vendedor = nome_completo do auth.uid()`)
  - UPDATE: apenas `admin_master` (aprovar/reprovar)
  - DELETE: apenas `admin_master`
- **`revendedor_baixas_pedido`**: SELECT igual ao movimento; INSERT/UPDATE/DELETE só admin_master
- **`revendedor_saldo_visibilidade`**: SELECT autenticado (precisa pra UI saber se mostra a aba); INSERT/UPDATE/DELETE só admin_master

### 1.6 Bucket de storage
Reutilizo o bucket existente `financeiro` com prefixo novo `revendedor-saldo/{uuid}.{ext}`. Políticas do bucket já permitem upload autenticado; RLS no banco garante que o revendedor só veja os comprovantes dele.

---

## Parte 2 — Funções de banco (lógica atômica de baixa)

### 2.1 `aprovar_comprovante_revendedor(_comprovante_id uuid)`
SECURITY DEFINER, só executável por admin_master. Em uma transação:
1. Marca o comprovante como `aprovado`, grava `aprovado_por` e `aprovado_em`.
2. Calcula o saldo atual do vendedor (soma dos movimentos).
3. Insere `entrada_comprovante` em `revendedor_saldo_movimentos` com `saldo_anterior`/`saldo_posterior`.
4. Chama `tentar_baixa_automatica(_vendedor)`.

### 2.2 `tentar_baixa_automatica(_vendedor text)`
SECURITY DEFINER. Lógica de quitação **integral**:

```
saldo := saldo_atual(_vendedor)
SELECT pedidos pendentes do vendedor:
  - status = 'Cobrado'
  - id NOT IN (SELECT order_id FROM revendedor_baixas_pedido)
  ORDER BY data_criacao ASC, created_at ASC  -- mais antigo primeiro (FIFO)

PARA CADA pedido p:
  valor_p := p.preco * p.quantidade
  SE saldo >= valor_p:
    INSERT em revendedor_saldo_movimentos (tipo='baixa_pedido', valor=valor_p, order_id=p.id, saldo_anterior, saldo_posterior)
    INSERT em revendedor_baixas_pedido (order_id=p.id, valor_pedido=valor_p, movimento_id=...)
    saldo -= valor_p
  SENÃO:
    -- pedido fica como "parcialmente coberto" virtualmente:
    -- nada é gravado, ele aparece na UI com saldo restante mostrando quanto falta
    BREAK  -- não pula pra próximo (preserva ordem FIFO)
```

**Regra de ouro implementada**: nenhuma baixa parcial é gravada. Se o saldo cobre 4 botas mas não a 5ª, somente as 4 são baixadas. A 5ª aparece com "faltam R$ X" calculado em tempo real (saldo restante < valor do pedido).

> **Decisão de FIFO**: pedidos mais antigos são quitados primeiro. Isso evita a tentação do sistema "pular" um pedido caro pra quitar dois pequenos atrás, o que distorce o fluxo. Caso prefira a regra "tentar maximizar quantidade de pedidos quitados", ajusto antes de implementar — me avise.

### 2.3 `ajustar_saldo_admin(_vendedor text, _delta numeric, _descricao text)`
SECURITY DEFINER, só admin_master. Insere `ajuste_admin` (positivo ou negativo) com `descricao` obrigatória. Dispara `tentar_baixa_automatica` se delta > 0.

### 2.4 `reprovar_comprovante_revendedor(_id uuid, _motivo text)`
SECURITY DEFINER, só admin_master. Marca como reprovado, grava motivo. Não cria movimento.

### 2.5 `estornar_baixa(_baixa_id uuid, _motivo text)`
SECURITY DEFINER, só admin_master. Para corrigir baixas indevidas:
- Insere movimento `estorno` (devolve o valor ao saldo)
- Apaga a linha de `revendedor_baixas_pedido` (libera o pedido pra ser baixado de novo)
- Tudo gravado com `descricao = motivo`

### 2.6 View `vw_revendedor_saldo`
View `SELECT vendedor, sum(CASE tipo WHEN 'entrada_comprovante' THEN valor WHEN 'ajuste_admin' THEN valor WHEN 'estorno' THEN -valor WHEN 'baixa_pedido' THEN -valor END) AS saldo_disponivel, sum(...) AS total_recebido, sum(...) AS total_utilizado FROM revendedor_saldo_movimentos GROUP BY vendedor`.

Usada pelos cards de resumo na UI.

---

## Parte 3 — Visibilidade da aba

`src/contexts/AuthContext.tsx` já expõe `role` e `user`. Adiciono um novo hook `useFinanceiroSaldoAccess()` que:
1. Se `role === 'admin_master'` → acesso total.
2. Senão, consulta `revendedor_saldo_visibilidade` cruzando com o `nome_completo` do profile do usuário.
3. Retorna `{ canSeeAdminView, canSeeRevendedorView, vendedorName }`.

`src/components/Header.tsx`:
- O link "FINANCEIRO" já aparece só para `isJuliana` (admin_master). **Adiciono** uma condição extra: se `useFinanceiroSaldoAccess().canSeeRevendedorView`, também aparece — mas levando para uma rota diferente (`/financeiro/saldo`) com a visão limitada do revendedor.

`src/pages/FinanceiroPage.tsx`:
- Adiciono uma terceira aba **"Saldo do Revendedor"** (visível só para admin_master) ao lado de "A Receber" e "A Pagar".

Nova rota `/financeiro/saldo` (página `RevendedorSaldoPage.tsx`) — visão simplificada para o revendedor (Stefany).

---

## Parte 4 — UI: Painel do Admin (`FinanceiroSaldoRevendedor.tsx`)

Componente novo, montado dentro da nova aba em `FinanceiroPage`. Acessível só para `admin_master`.

**Layout:**
1. **Resumo geral** (cards): total recebido (todos), total utilizado em baixas, saldo disponível agregado, comprovantes pendentes de aprovação (badge contador).
2. **Tabela: Comprovantes pendentes** — vendedor, valor, data, observação, anexo (visualizar via `ComprovanteViewer` existente), botões Aprovar / Reprovar (com motivo). Aprovar dispara o RPC `aprovar_comprovante_revendedor`.
3. **Tabela: Saldo por revendedor** — vendedor, total recebido, total utilizado, saldo disponível, total pendente em pedidos cobrados (calculado), botão "Detalhes" abre drawer com:
   - Lista de movimentos (extrato cronológico inverso)
   - Lista de baixas realizadas (pedido, valor, data, link pra ficha)
   - Lista de pedidos pendentes (cobrados, ordenados FIFO) com indicador "faltam R$ X" no primeiro que não dá pra quitar
   - Botão "Ajustar saldo" (abre dialog, exige motivo)
   - Botão "Estornar baixa" em cada linha de baixa (com confirmação)
4. **Filtro de visibilidade**: cards/tabela permitem filtrar por revendedor.

Reuso de componentes: `Card`, `Table`, `Dialog`, `AlertDialog`, `ComprovanteViewer`, `formatCurrency`.

---

## Parte 5 — UI: Painel do Revendedor (`RevendedorSaldoPage.tsx`)

Página em rota `/financeiro/saldo`. Para teste, só Stefany abre — mas o componente já fica pronto para qualquer revendedor adicionado em `revendedor_saldo_visibilidade`.

**Layout:**
1. **Cards de resumo**:
   - Saldo total recebido
   - Saldo já utilizado em baixas
   - **Saldo disponível** (em destaque)
2. **Botão grande "Enviar comprovante"** — abre dialog com:
   - Upload (PDF ou imagem; reusa `validateComprovante`)
   - Valor pago
   - Data do pagamento
   - Observação (opcional)
   - Submit insere em `revendedor_comprovantes` com `status='pendente'`
   - Anti-duplicata por hash (mesma lógica do `checkDuplicates` atual)
3. **Tabela: Meus comprovantes** — data, valor, status (badge: pendente / aprovado / reprovado), motivo (se reprovado), link pro arquivo.
4. **Tabela: Meus pedidos cobrados** — lista pedidos do próprio vendedor com status `'Cobrado'`:
   - Número, descrição (modelo + tamanho), valor total, valor abatido (sempre 0 ou valor integral — nunca parcial), valor restante, status visual:
     - **Pago via saldo** (verde) — existe linha em `revendedor_baixas_pedido`
     - **Aguardando saldo** (amarelo) — sem baixa, valor cabe no saldo restante mas é o próximo da fila
     - **Parcialmente coberto** (laranja) — sem baixa, faltam R$ X pra quitar (mostra exato)
     - **Pendente** (cinza) — sem baixa, sem saldo suficiente
5. **Tabela: Histórico de baixas** — pedido, valor, data, comprovante de origem (rastreabilidade).

O revendedor **não enxerga** dados de outros revendedores (garantido por RLS no banco, não só na UI).

---

## Parte 6 — Auditoria

Toda operação já é auditada por design via `revendedor_saldo_movimentos`:
- `entrada_comprovante` → quem enviou (via `revendedor_comprovantes.enviado_por`), quem aprovou (`aprovado_por`), data, valor, saldo antes/depois
- `baixa_pedido` → pedido vinculado (`order_id`), valor, saldo antes/depois, `created_by` (admin que aprovou o comprovante que gerou a baixa, ou que ajustou)
- `ajuste_admin` → quem fez (`created_by`), motivo (`descricao`), saldo antes/depois
- `estorno` → quem fez, motivo

Na tela admin, o drawer "Detalhes do revendedor" mostra esse histórico bruto na ordem cronológica inversa, com tradução amigável dos tipos.

---

## Parte 7 — O que NÃO é alterado (garantia)

- ✅ Tabela `orders` — nenhuma coluna nova, nenhum trigger, nenhuma mudança em status. O fluxo "Cobrado → Pago" manual continua existindo paralelamente.
- ✅ `financeiro_a_receber` e `financeiro_a_pagar` — intactos.
- ✅ Comissão (`CommissionPanel.tsx`), relatórios, dashboards, fichas, produção — nenhum arquivo tocado.
- ✅ Header só ganha a condição extra de visibilidade; navegação e estilos preservados.

---

## Arquivos a criar

- `supabase/migrations/{timestamp}_revendedor_saldo.sql` — 4 tabelas + RLS + 5 funções + view + seed da Stefany
- `src/lib/revendedorSaldo.ts` — helpers TS (tipos, fetchers, RPCs)
- `src/hooks/useFinanceiroSaldoAccess.ts` — controle de visibilidade
- `src/hooks/useRevendedorSaldo.ts` — query + mutações (com TanStack Query)
- `src/components/financeiro/saldo/FinanceiroSaldoRevendedor.tsx` — painel admin
- `src/components/financeiro/saldo/ComprovantesPendentes.tsx` — tabela de aprovação
- `src/components/financeiro/saldo/SaldoPorRevendedor.tsx` — tabela agregada
- `src/components/financeiro/saldo/DetalhesRevendedorDrawer.tsx` — drawer com extrato
- `src/components/financeiro/saldo/AjusteSaldoDialog.tsx`
- `src/components/financeiro/saldo/EnviarComprovanteDialog.tsx`
- `src/pages/RevendedorSaldoPage.tsx` — visão do revendedor
- Memória: `mem://features/financeiro/saldo-revendedor.md` documentando a regra de baixa integral, FIFO e visibilidade restrita

## Arquivos a editar

- `src/pages/FinanceiroPage.tsx` — terceira aba (admin)
- `src/components/Header.tsx` — visibilidade condicional do link
- `src/App.tsx` — nova rota `/financeiro/saldo`
- `mem://index.md` — referência ao novo memo

---

## Pontos de decisão (assumidos — me corrija antes da execução se algum estiver errado)

1. **Ordem de baixa**: FIFO por data de criação do pedido (mais antigo primeiro). Alternativa seria "maximizar quantidade de pedidos quitados" ou "deixar admin escolher manualmente".
2. **Vinculação do vendedor ao login**: usar `profiles.nome_completo` para casar com `orders.vendedor` e `revendedor_saldo_movimentos.vendedor`. É como o resto do sistema já faz hoje.
3. **Pedidos elegíveis**: somente status `'Cobrado'` entram na fila de baixa automática. Pedidos `'Entregue'`, `'Pago'` e outros ficam fora — confirmando que o admin marca como "Cobrado" quando começa a cobrar do revendedor.
4. **Bucket**: reutilizar `financeiro` com prefixo `revendedor-saldo/` em vez de criar bucket novo.
5. **Reprovação**: motivo é obrigatório. Comprovante reprovado fica visível pro revendedor com o motivo.
