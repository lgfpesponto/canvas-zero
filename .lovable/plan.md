# Permitir Entrada Bordado vinda de "Baixa Corte"

## Diagnóstico

O role `bordado` (Neto/Débora) não consegue dar entrada em pedidos novos porque três camadas bloqueiam pedidos fora das etapas de bordado:

1. **RLS SELECT** em `orders` — política `Bordado users can view bordado orders` só libera `status IN ('Entrada Bordado 7Estrivos','Baixa Bordado 7Estrivos')`. Resultado: ao escanear um pedido em "Baixa Corte", `fetchOrderByScan` retorna `null` → toast "pedido não encontrado".
2. **RLS UPDATE** em `orders` — mesma restrição.
3. **RPC `bordado_baixar_pedido`** — rejeita quando o status atual não é Entrada/Baixa Bordado para usuários do role `bordado`.

## Mudanças

### 1. Migration (RLS + RPC)

- Substituir as policies SELECT e UPDATE de `orders` para o role `bordado`, incluindo `'Baixa Corte'` no array de status permitidos.
- Recriar `bordado_baixar_pedido` para permitir, no role `bordado`:
  - `Baixa Corte → Entrada Bordado 7Estrivos` (novo, libera o scan de entrada)
  - `Entrada Bordado ↔ Baixa Bordado` (mantém)
  - Qualquer tentativa de `Baixa Corte → Baixa Bordado` continua bloqueada (precisa passar por Entrada).
  - Demais status seguem rejeitados com mensagem clara.

### 2. Frontend — `src/pages/BordadoPortalPage.tsx`

Em `processScan` modo `entrada`, melhorar a mensagem de erro quando o pedido vier de status diferente de `Baixa Corte` (ex: "Em aberto"), explicitando: *"X em 'Em aberto' — só pode dar entrada bordado a partir de 'Baixa Corte'"*. Os quadros visuais continuam mostrando apenas Entrada/Baixa Bordado (sem poluir com pedidos do corte).

## Resultado

Neto/Débora escaneiam um pedido em "Baixa Corte" no botão **ESCANEAR PARA DAR ENTRADA** e ele entra em "Entrada Bordado 7Estrivos" com histórico registrado. Pedidos em outras etapas seguem recusados.
