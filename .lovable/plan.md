# Implementado: Link público de acompanhamento do pedido

- Rota `/rastreio/:id` (fora do ChromeWrapper) em `src/pages/PublicTrackingPage.tsx`.
- RPC `public.get_public_tracking(uuid)` security definer (sem expor `orders` a `anon`); omite preço, cliente, comissão e conferido.
- Detalhe do pedido: linha do prazo agora mostra "Prazo Xdu · Y restantes" + botões **Copiar** e **Abrir** (link `{origin}/rastreio/{id}`).
- Página pública: cabeçalho com Vendedor, prazo total + restante, stepper de etapas, histórico de produção, ficha do pedido e QR Code do `order.fotos[0]`.
- Documentado em `docs/BUSINESS_RULES.md` seção AB.
