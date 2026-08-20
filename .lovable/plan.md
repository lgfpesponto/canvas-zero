# Erro "Faça login novamente" ao comprar Bota Pronta Entrega

## O que está acontecendo

A mensagem não vem da compra em si: ela aparece sempre que a função que salva o pedido devolve "falhou", sem dizer o motivo real.

O que os registros mostram no momento do erro:

- O navegador tentou renovar a sessão no Supabase e recebeu `400 refresh_token_not_found` ("Invalid Refresh Token: Refresh Token Not Found").
- Logo depois a tela foi para `/login`.

Ou seja: a sessão do vendedor realmente caducou no momento do clique (o app parecia logado porque a tela não tinha atualizado ainda). Ao salvar, o código verifica a sessão, não encontra, faz logout silencioso e mostra aquele texto genérico.

Causa provável do token perdido: a mesma conta sendo usada em mais de uma aba/dispositivo (a Bagy/site e o portal), o que invalida o refresh token antigo na rotação do Supabase. Isso precisa ser confirmado com o vendedor.

## Correções propostas

1. **Não perder o pedido preenchido.** Antes de desistir, tentar renovar a sessão uma vez (`refreshSession`). Se renovar, o pedido é salvo normalmente e o vendedor nem percebe.
2. **Se realmente caiu a sessão:** manter o formulário preenchido, mostrar aviso claro ("Sua sessão expirou — entre novamente e o pedido continua preenchido") e só então mandar para o login, voltando para a página de extras depois de entrar.
3. **Parar de mentir sobre o motivo.** Quando o erro não for de sessão (por exemplo, número de pedido repetido, bloqueio de permissão ou campo inválido), mostrar a mensagem real do erro em vez de "faça login novamente". Isso vale para as três telas que usam o mesmo texto: Extras, Faça seu Pedido e Pedido de Cinto.
4. **Reduzir a chance de a sessão cair.** Revisar a configuração de autenticação para permitir reuso do token de atualização por alguns segundos (evita conflito entre abas) e evitar logout imediato em falha de rede.

## Verificação

- Reproduzir o salvamento de uma Bota Pronta Entrega com sessão válida e com sessão forçadamente expirada, conferindo que no primeiro caso salva e no segundo o formulário é preservado.
- Confirmar com o vendedor se ele usa o portal em mais de uma aba/computador ao mesmo tempo.

## Detalhes técnicos

- `src/contexts/AuthContext.tsx` — `addOrder` / `addOrderBatch`: trocar o retorno `boolean` por `{ ok, reason, message }` (ou lançar erro tipado), tentar `supabase.auth.refreshSession()` antes de `logout()`, e propagar a mensagem do erro do insert.
- `src/pages/ExtrasPage.tsx:382`, `src/pages/OrderPage.tsx:1800`, `src/pages/BeltOrderPage.tsx:576`: usar o motivo retornado; em `session_expired` guardar rascunho do formulário e redirecionar para `/login` com retorno.
- Configuração de auth do Supabase: verificar rotação/intervalo de reuso de refresh token.
