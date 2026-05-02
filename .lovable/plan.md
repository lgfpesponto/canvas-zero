## Contexto rápido (como funciona hoje)

O sistema **NÃO** move pedido pra "Pago" automaticamente só por estar em "Cobrado". A baixa só acontece quando entra crédito no saldo do vendedor (comprovante aprovado, ajuste positivo, ou lançamento em "A Receber"). Aí a função `tentar_baixa_automatica` percorre os pedidos em "Cobrado" do vendedor (mais antigos primeiro) e abate **integralmente** enquanto o saldo cobrir. Cada baixa registra:

- linha em `revendedor_baixas_pedido` (com `order_id`, `vendedor`, `valor_pedido`, `created_at`)
- movimento em `revendedor_saldo_movimentos` tipo `baixa_pedido`
- pedido vai pra `Pago` com histórico marcado como "Baixa automática" (nunca o nome da Juliana)

Isso me dá tudo que preciso pra montar o painel pedido — não precisa migration nem mudança de banco.

---

## O que vou construir

### 1) Card resumo no topo da aba "Saldo do Vendedor" (admin master)

Novo card ao lado dos atuais (Saldo, A pagar etc.):

```text
┌──────────────────────────────┐
│ Pedidos abatidos             │
│ 🔢 42 pedidos                │
│ 💰 R$ 28.450,00              │
│ [Período: Este mês ▾]        │
│ [Vendedor: Todos ▾]          │
└──────────────────────────────┘
```

- Conta linhas de `revendedor_baixas_pedido` no período + vendedor selecionados
- Soma `valor_pedido`
- Filtro de período: Hoje / Últimos 7 dias / Este mês / Mês anterior / Personalizado
- Filtro de vendedor: dropdown com todos os vendedores que têm baixas (ou "Todos")
- Estado dos filtros persistido em URL (`?abatidosDe=...&abatidosAte=...&abatidosVendedor=...`) seguindo o padrão do projeto

### 2) Bloco filtrável dentro do drawer "Detalhes do Vendedor"

Hoje o drawer já mostra a tabela "Baixas realizadas" do vendedor. Vou adicionar acima dela:

- Mini-resumo: **"X pedidos abatidos · R$ Y,YY"** no período selecionado
- Seletor de período compacto (mesmas opções do card)
- A tabela "Baixas realizadas" passa a respeitar esse filtro de período
- Cada linha já vai mostrar o número do pedido clicável (já implementado na rodada anterior)

O drawer já é por vendedor, então não precisa do filtro de vendedor aqui.

### 3) Detalhamento opcional (expandir)

No card resumo da aba principal, um botão **"Ver lista"** abre um modal/sheet com a lista detalhada das baixas do filtro atual:

| Data | Pedido | Vendedor | Valor |
|------|--------|----------|-------|
| 02/05/26 | #95928488 (link) | Stefany | R$ 680,00 |
| ... | ... | ... | ... |

Com botão "Exportar CSV" (opcional, simples).

---

## Arquivos a editar/criar

- `src/lib/revendedorSaldo.ts` — adicionar helpers:
  - `fetchBaixasFiltradas({ de, ate, vendedor? })` → consulta `revendedor_baixas_pedido` com filtros
  - `fetchVendedoresComBaixas()` → lista distinct de vendedores que aparecem em `revendedor_baixas_pedido` (pra preencher o dropdown)
- `src/components/financeiro/saldo/FinanceiroSaldoRevendedor.tsx` — novo card "Pedidos abatidos" + modal "Ver lista"
- `src/components/financeiro/saldo/PedidosAbatidosCard.tsx` (novo) — card isolado com filtros, contagem e valor
- `src/components/financeiro/saldo/PedidosAbatidosListaDialog.tsx` (novo) — modal com tabela detalhada + export CSV
- `src/components/financeiro/saldo/DetalhesRevendedorDrawer.tsx` — adicionar mini-resumo e seletor de período acima da tabela "Baixas realizadas"

## Não vou mexer

- Lógica de baixa automática no banco (já está correta e atende o que você descreveu)
- Histórico do pedido (já mostra "Baixa automática" sem nome da Juliana)
- Coluna "Pedido" na tabela de baixas (já mostra número clicável)

## Observações

- Tudo client-side a partir de `revendedor_baixas_pedido` (RLS já permite admin_master ver todas)
- Sem migration, sem alteração de banco
- Filtros usam URL params pra você poder copiar/compartilhar a visão filtrada
- Período padrão ao abrir: **Este mês**
