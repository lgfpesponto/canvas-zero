# Remover histórico de produção do link público de rastreio

## O que muda
Na página pública `/rastreio/:id` (usada em todos os links enviados aos clientes), a seção "Histórico de produção" será removida. O cliente continuará vendo:

- Cabeçalho do pedido (número, vendedor, prazo, etapa atual)
- Stepper "Etapas de produção"
- Detalhes da Bota + foto

## Técnico
Em `src/pages/PublicTrackingPage.tsx`:
- Remover a `<section>` "Histórico de produção".
- Remover o `useMemo` `historicoDesc`, que fica sem uso.

Nenhuma alteração de banco, RPC ou permissões — a mudança é apenas visual e vale automaticamente para todos os links de rastreio.
