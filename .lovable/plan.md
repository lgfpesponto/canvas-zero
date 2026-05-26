## Objetivo

`admin_producao` deixa de ver QUALQUER valor em R$ na interface, exceto na área **Admin → Configurações** (onde edita preços de bordados, opções etc.) e nos **formulários de criação/edição de pedido** (mantém visível para conferir o que está escolhendo).

## O que vai ser escondido para admin_producao

1. **Listas de pedidos / extras / cintos**
   - Coluna **Valor** / **Total**
   - **Total selecionado** no rodapé quando marca vários
   - Coluna **Desconto** (se houver)

2. **Detalhe do pedido**
   - Bloco inteiro de **Composição de Preço**
   - Linhas de **Desconto / Acréscimo / Ajuste**
   - **Total final** no topo
   - Botão **"Ajustar valor"** / "Solicitar ajuste" some

3. **Dashboard**
   - Cards de **Faturamento, Comissão, Saldo**
   - Gráfico **Vendas por vendedor**
   - Gráfico **Performance de vendas**
   - (Mantém: produção, etapas, contadores de quantidade)

4. **Relatórios**
   - Cards/coluna de R$ em qualquer relatório de produção que mostre valor
   - PDFs de cobrança / financeiros somem do menu

5. **Menu / navegação**
   - Esconder toda a seção **Financeiro** (Saldo Revendedor, Comprovantes, A Pagar, A Receber, Histórico de PDFs de cobrança, Solicitações de Ajuste)
   - Bloquear acesso por URL direta também (redirect para `/`)

## O que CONTINUA visível para admin_producao

- **Formulários** de criar/editar pedido: selects continuam mostrando "Bordado X — R$ 30" (precisa para escolher).
- **Admin → Configurações** inteira: edição de preços de variações, custom_options, ficha, etc.
- **PDFs de produção/corte/bordado**: não mexer, continuam iguais (não têm R$ mesmo).

## Como implemento (técnico)

Criar um hook simples `useCanSeeValues()` em `src/hooks/useCanSeeValues.ts`:

```ts
export function useCanSeeValues() {
  const { role } = useAuth();
  return role !== 'admin_producao';
}
```

E aplico condicionalmente em cada ponto:
- `{canSeeValues && <TableCell>{formatCurrency(...)}</TableCell>}`
- `{canSeeValues && <ComposicaoPreco ... />}`
- `{canSeeValues && <DashboardFinanceiroCards />}`

Para o **menu lateral / rotas**: já existe lógica de role no `Header`/`Sidebar` e nas rotas. Adiciono `admin_producao` na lista de bloqueio para as rotas financeiras e redireciono para `/` se acessar por URL.

## Arquivos que vou tocar

- **Novo**: `src/hooks/useCanSeeValues.ts`
- **Listas/Detalhe**: `OrderPage.tsx`, `ExtrasPage.tsx`, `BeltOrderPage.tsx`, `OrderDetailPage.tsx`, `ReportsPage.tsx`
- **Dashboard**: componentes de cards/gráficos financeiros em `src/components/dashboard/`
- **Menu + rotas**: `Header.tsx`/`AppSidebar.tsx`, `App.tsx` (guards de rota financeira)
- **Páginas financeiras**: adicionar redirect no topo de cada uma (Saldo, Comprovantes, A Pagar, A Receber, Solicitações de Ajuste, Histórico PDFs cobrança)

## Não muda no banco

Nenhuma RLS, nenhuma migration. É 100% camada de UI — admin_producao continua podendo abrir pedido, mudar status, conferir, etc., só não vê valores.

Confirma que pode implementar assim?
