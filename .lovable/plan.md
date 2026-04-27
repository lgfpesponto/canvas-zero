# Filtros padronizados no Saldo do Vendedor

## Objetivo

Substituir o filtro único atual da aba **Financeiro → Saldo do Vendedor** pela barra de filtros padrão usada em "A Receber": **Período**, **Vendedor** e **Tipo**, lado a lado, com o mesmo visual.

## Como vai ficar

Barra única no topo da aba:

```text
[Filter] Período: [Mês atual ▾]   Vendedor: [Todos ▾]   Tipo: [Todos ▾]
```

### Filtros

- **Período** — `Mês atual` (default) · `Últimos 30 dias` · `Todos`
- **Vendedor** — `Todos` + lista de usuários com role `vendedor` (mesma lógica atual)
- **Tipo** — `Todos` · `Pendente` · `Aprovado` · `Reprovado` · `Utilizado` (status do comprovante)

### O que cada filtro afeta

Os três filtros são aplicados em conjunto sobre o mesmo conjunto de dados:

- **Cards do topo** (Total recebido, Total utilizado, Saldo disponível, Comprovantes pendentes) — recalculados a partir dos movimentos/comprovantes que passam pelos filtros.
- **Tabela "Saldo por vendedor"** — mostra só o vendedor filtrado (ou todos), com totais do período.
- **Lista de comprovantes** — só aparece quando um vendedor específico é selecionado, e é filtrada por período e tipo.

### Regras de período

- Período aplicado sobre `created_at` dos movimentos (`revendedor_saldo_movimentos`) e dos comprovantes (`revendedor_comprovantes`).
- "Mês atual" = do dia 1 do mês corrente até hoje.
- "Últimos 30 dias" = hoje −30 até hoje.
- "Todos" = sem corte.

### Saldo disponível

Saldo é cumulativo por natureza, então o card "Saldo disponível":
- Quando **Período = Todos**: usa o saldo atual da view `vw_revendedor_saldo` (igual hoje).
- Quando há período: mostra o saldo atual da view (snapshot real) + uma legenda "saldo atual" para deixar claro que esse número não muda com o período (já que saldo é cumulativo). Os outros cards (Recebido / Utilizado) são os do período.

## Detalhes técnicos

- Editar `src/components/financeiro/saldo/FinanceiroSaldoRevendedor.tsx`:
  - Trocar o card de filtro único pela toolbar com 3 selects (mesmo layout/CSS do `FinanceiroAReceber.tsx` linhas 519–554).
  - Adicionar estados `filterPeriodo`, `filterVendedor`, `filterTipo`.
  - Carregar todos os movimentos e comprovantes uma vez (via novas funções `fetchMovimentosTodos` e `fetchComprovantesTodos` em `src/lib/revendedorSaldo.ts`) e aplicar os filtros em memória para recalcular cards e listas.
- Editar `src/components/financeiro/saldo/ComprovantesPorRevendedor.tsx`:
  - Remover o `useEffect` que busca comprovantes; passar a receber a lista já filtrada via prop `comprovantes`.
- Sem mudanças no banco, RPCs ou RLS.
