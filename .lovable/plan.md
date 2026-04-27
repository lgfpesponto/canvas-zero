# Filtro Vendedor: usar a mesma lista do "A Receber"

## O que muda

Substituir a fonte do filtro Vendedor da aba **Financeiro → Saldo do Vendedor** para mostrar **todos os vendedores que aparecem em pedidos** (igual ao A Receber), incluindo Denise, Estoque, Fabiana, Larissa, Maria Gabriela, Mariana Ribeiro, Rafael, Rancho Chique, Samuel etc.

## Detalhes técnicos

- `src/components/financeiro/saldo/FinanceiroSaldoRevendedor.tsx`:
  - Trocar `fetchVendedoresUsuarios` por `fetchVendedoresList` (já usado em `FinanceiroAReceber.tsx`), que pega vendedores distintos da tabela `orders` (incluindo clientes virtuais da Juliana).
  - Renomear estado `vendedoresUsuarios` → `vendedoresLista`.
- Sem mudanças no banco, RPCs ou no resto da lógica de filtros.

## Sem mudanças

- Cards, tabela, lista de comprovantes e baixa manual continuam funcionando exatamente como agora — só a fonte da lista do select muda.
