## Objetivo
Impedir criação de pedido com número duplicado em TODAS as telas de compra, com aviso em tempo real (igual já funciona em `OrderPage`, `BeltOrderPage` e `ExtrasPage`).

## Diagnóstico
Já existe o hook `useCheckDuplicateOrder` que consulta `orders.numero` com debounce e devolve `isDuplicate`. Ele já é usado com sucesso em Bota / Cinto / Extras clássicos.

Faltam duas telas de criação:

1. **`src/pages/ModelosPage.tsx`** — diálogo "Comprar — {modelo}" (compra direta a partir da página Modelos). Hoje só valida "informe o número" e delega ao `addOrder`/`addOrderBatch`; não avisa o usuário se o número já existe antes de clicar em Confirmar.
2. **`src/pages/DynamicOrderPage.tsx`** — página de pedido de extras dinâmicos (fichas configuráveis por slug). Hoje monta o número via `count()` de forma automática, mas nunca checa colisão antes do `insert`, então pode falhar/duplicar silenciosamente.

Nas demais telas (`OrderPage`, `BeltOrderPage`, `ExtrasPage`) o aviso ao vivo + bloqueio de submissão já existe — nada muda nelas.
O `AuthContext.addOrder` já faz a checagem final no servidor; vamos manter (defesa em profundidade).

## Mudanças

### 1. `src/pages/ModelosPage.tsx`
- Importar `useCheckDuplicateOrder` e `DUPLICATE_MSG` de `@/hooks/useCheckDuplicateOrder`.
- `const { isDuplicate: numeroDuplicado, checking } = useCheckDuplicateOrder(vNumeroPedido.trim());`
- No `<Input>` do "Número do pedido" (linha ~456): adicionar borda vermelha quando `numeroDuplicado`, e mostrar mensagem abaixo em `text-destructive` com `DUPLICATE_MSG` (ou "Verificando…" quando `checking`).
- No handler de confirmação (linha ~282): se `numeroDuplicado`, `toast.error(DUPLICATE_MSG)` e `return`.
- Desabilitar o botão "Confirmar" da compra quando `numeroDuplicado || checking`.
- No botão "Gerar Grade" (linha ~519): bloquear também se `numeroDuplicado` (o batch usa prefixo — o próprio `addOrderBatch` já verifica cada número gerado, mas evitamos abrir o dialog de grade com prefixo inválido).

### 2. `src/pages/DynamicOrderPage.tsx`
- Adicionar campo visível "Número do pedido" (input controlado) no bloco de campos nativos, ao lado de Vendedor/Cliente. Hoje o número é gerado 100% automático — vamos manter geração automática como default (via `useAutoOrderNumero` seguindo o padrão das outras telas) mas permitir edição manual, para que o usuário veja/edite e o aviso de duplicidade faça sentido.
- Usar `useAutoOrderNumero(vendedor)` para pré-preencher.
- Usar `useCheckDuplicateOrder(numero.trim())` para exibir aviso em tempo real (borda vermelha + `DUPLICATE_MSG`).
- No `handleSubmit`:
  - Se `numeroDuplicado` → `toast.error(DUPLICATE_MSG)` e `return`.
  - Substituir a geração baseada em `count()` (que é frágil e pode colidir) pelo valor do input; se estiver vazio, cair no `autoNumero`.
  - Antes do `insert`, fazer uma checagem final `select id from orders where numero = ?` — se existir, abortar com toast (mesma defesa que o `addOrder` do AuthContext já aplica).
- Desabilitar botão "enviar pedido" enquanto `numeroDuplicado || checking`.

### 3. Sem mudanças de banco
Não precisa migração. Opcionalmente poderíamos adicionar `UNIQUE(numero)` em `orders`, mas isso pode quebrar dados legados (`addOrderBatch` já valida em lote). **Não incluído neste plano** — só falamos se você pedir depois.

## Fora do escopo
- Edição de pedidos existentes (`EditOrderPage`, `EditBeltPage`, `EditExtrasPage`) — o número não é alterado nesses fluxos.
- Fluxos internos automáticos (Bagy, Registrar Erro, geração de estoque a partir de pedido pronto) — usam números derivados/controlados por servidor.
