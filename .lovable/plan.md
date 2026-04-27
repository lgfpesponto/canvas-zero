# Filtro do Saldo: só usuários com role `vendedor`

## O que muda

No filtro de vendedor da aba **Financeiro → Saldo do Vendedor**, mostrar **apenas** usuários cadastrados com a role `vendedor`. Usuários com role `vendedor_comissao` (ex.: Rancho Chique / Site), `admin`, `admin_master` e `admin_producao` deixam de aparecer no select.

## Detalhes técnicos

- Arquivo: `src/lib/revendedorSaldo.ts`, função `fetchVendedoresUsuarios()`.
- Trocar `.in('role', ['vendedor', 'vendedor_comissao'])` por `.eq('role', 'vendedor')`.
- O resto da lógica do filtro (união com vendedores que já têm saldo histórico) continua igual, garantindo que ninguém com saldo registrado some da lista.

## Sem mudanças

- Banco de dados, RPCs e RLS permanecem iguais.
- Cards do topo, tabela de saldos e lista de comprovantes continuam reagindo ao filtro como já estão.
