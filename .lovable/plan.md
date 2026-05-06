## Objetivo

Botão (switch) no Financeiro que liga/desliga globalmente a **baixa automática** de pedidos "Cobrado" contra o saldo do revendedor. Quando OFF, nenhuma baixa nova acontece automaticamente — saldo continua entrando normalmente, só não abate pedidos sozinho.

## Como funciona hoje

A função `tentar_baixa_automatica(_vendedor, _admin_id)` é chamada em 4 lugares:
1. `aprovar_comprovante_revendedor` (admin aprova comprovante)
2. `ajustar_saldo_revendedor` (admin faz ajuste +)
3. Trigger `espelhar_a_receber_em_saldo` (admin lança em A Receber)
4. Trigger `trg_orders_retentar_baixa_apos_estorno` (depois de estorno automático)

Em todos os pontos, ela varre os pedidos Cobrado do vendedor (FIFO) e move pra Pago se tem saldo.

## Solução

### 1. Tabela `system_flags` (banco)
Tabela genérica chave/valor pra esse e futuros toggles globais.

```text
system_flags
  key text PK            ex: 'baixa_automatica_ativa'
  value boolean          true/false
  updated_at, updated_by
```

RLS: SELECT pra qualquer autenticado, UPDATE/INSERT só `admin_master`.

Seed inicial: `('baixa_automatica_ativa', true)` — mantém comportamento atual.

### 2. Modificar `tentar_baixa_automatica`
Logo no início:
```
IF NOT (SELECT value FROM system_flags WHERE key='baixa_automatica_ativa') THEN
  RETURN 0;
END IF;
```
Não quebra nenhuma chamada existente — comprovantes ainda são aprovados, saldo entra, só não baixa pedidos.

### 3. UI — Switch no Financeiro
No cabeçalho da aba **Saldo Revendedor** (`FinanceiroSaldoRevendedor.tsx`), ao lado dos filtros:

- `Switch` com label **"Baixa automática"**
- Estado verde ON / cinza OFF
- Tooltip explicativo: *"Quando ligado, pedidos no status Cobrado são pagos automaticamente assim que o saldo do revendedor cobre o valor. Desligar pausa apenas as baixas — saldos continuam entrando normalmente."*
- Visível apenas para `admin_master`
- Ao alternar: confirmação ("Tem certeza? Isso afeta todos os revendedores") → update na tabela → toast de sucesso
- Quando OFF, mostrar pequeno alerta amarelo no topo da aba: *"Baixa automática desligada — pedidos Cobrado não estão sendo pagos automaticamente."*

### 4. Hook + helper
- `useSystemFlag('baixa_automatica_ativa')` → retorna `{ value, loading, setValue }` com Realtime subscription pra refletir mudança em todas as abas abertas.

## Fora de escopo
- Não mexe no fluxo de aprovação de comprovante nem em A Receber.
- Não cria botão "rodar baixa agora" — quando religar, a próxima entrada de saldo (ou aprovação) já vai disparar a baixa retroativa naturalmente.
- Sem auditoria detalhada de quem ligou/desligou nesta versão (fica registrado em `updated_by` mas sem tela própria).
