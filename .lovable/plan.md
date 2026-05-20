## Entendi o ponto

`preco_congelado` **não pode** travar o valor do pedido para sempre. Ele só serve para impedir que mudanças na régua de preços (admin/configurações) "vazem" para pedidos antigos via processos automáticos em background.

Qualquer edição **manual** no próprio pedido (mudar bordado, trocar modelo, aplicar desconto, mudar quantidade, etc.) tem que recalcular normalmente e gravar o novo `preco` — destravando o valor para refletir o que realmente está sendo cobrado.

## O que já está certo no código atual

- `EditOrderPage` (linha 464): no Salvar grava `preco = total - desconto` recalculado pela régua atual. **Ignora** `preco_congelado` ✓
- `OrderDetailPage` aplicação de desconto (linha 1036): grava `novoTotal` direto ✓
- `EditExtrasPage` / `EditBeltPage`: mesmo padrão (recalculam no save)

Ou seja: abrir o pedido, mudar qualquer coisa e clicar Salvar **já** atualiza o preço com a régua atual de hoje.

## O que `preco_congelado = true` bloqueia (e deve continuar bloqueando)

| Processo | O que faz | Bloqueado? |
|---|---|---|
| `PrecoReconciler` (edge `reconciliar-precos`) | Varredura quando admin muda preços na régua | ✅ Sim |
| `PrecoAutoBackfill` | Drenador silencioso em background | ✅ Sim |
| `precoBackfillQueue` | Fila passiva ao carregar listas | ✅ Sim |
| Auto-fix do `OrderDetailPage` (useEffect linha 122) | Conserta preço ao abrir o pedido | ✅ Sim |
| **Save manual do EditOrderPage / desconto / edit extras** | Edição humana | ❌ **NÃO bloqueia** — recalcula sempre |

## Ajuste único necessário

Garantir que **toda** rota de save manual force `preco_migrado_v2 = true` e mantenha `preco_congelado = true` no payload (cinto de segurança), para que:

1. O pedido sempre reflita o último valor manual editado.
2. O reconciler nunca mais reverta esse valor automaticamente quando o admin mexer na régua depois.

Nenhuma mudança de comportamento adicional — só revisar os payloads de save em:
- `src/pages/EditOrderPage.tsx` (save final)
- `src/pages/EditExtrasPage.tsx` (save final)
- `src/pages/EditBeltPage.tsx` (save final)
- `src/pages/OrderDetailPage.tsx` (aplicar desconto, mudar quantidade)

para confirmarem o `preco_congelado: true` explícito junto do novo `preco`.

## Confirmação

O comportamento que você quer:
- Bota custa 300, admin muda preço do bordado na configuração → **continua 300** ✓
- Bota custa 300, você abre e troca o bordado / aplica desconto / muda qtd → **recalcula para 290 (ou o que for)** ✓
- Quer "destravar" e recobrar pela régua atual → basta abrir o pedido e clicar Salvar sem mudar nada (o auto-recalc do save grava o valor novo)

Posso aplicar essa revisão dos payloads de save?
