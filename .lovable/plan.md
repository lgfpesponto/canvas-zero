

## Sistema de Comissao — Estilo "Botas na producao" + PDF

### Resumo

O painel de comissao usara o mesmo estilo visual do card "Botas na producao" (card com `bg-card rounded-xl p-6 western-shadow`, bloco `bg-muted rounded-lg p-4`, numero grande em `text-3xl font-bold text-primary`, barra de progresso `Progress` e texto descritivo abaixo). O relatorio sera exportado em PDF via jsPDF, seguindo o padrao dos outros relatorios do sistema.

### Arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/CommissionPanel.tsx` | **Novo** — painel de comissao com estilo "Botas na producao" + botao PDF |
| `src/lib/pdfGenerators.ts` | Nova funcao `generateCommissionPDF` |
| `src/pages/Index.tsx` | Renderizar `CommissionPanel` no dashboard do usuario "site" |

### Detalhes

#### 1. `CommissionPanel.tsx` — Visual

Seguir exatamente o estilo do card "Botas na producao":

```text
┌─────────────────────────────────────────┐  bg-card rounded-xl p-6 western-shadow
│ 💰 Comissao Mensal    [Filtro mes ▼]    │
│                                         │
│ ┌─────────────────────────────────┐     │  bg-muted rounded-lg p-4
│ │ VENDAS NO MES                   │     │
│ │ 25 vendas                       │     │  text-3xl font-bold text-primary
│ │ Comissao: R$250,00              │     │
│ └─────────────────────────────────┘     │
│                                         │
│ ████████████░░░░░░░  Progress h-3       │  barra de progresso ate 60
│ 25 de 60 vendas para a meta             │  texto descritivo
│                                         │
│ Faltam 35 vendas para bater a meta      │  mensagem dinamica
│ (ou) 🎉 Meta batida! Comissao: R$650    │
│                                         │
│ [Gerar relatorio de comissao] (PDF)     │  botao que gera PDF
└─────────────────────────────────────────┘
```

- Usar componente `Progress` existente (mesmo do "Botas na producao")
- Quando `vendas >= 60`: emoji 🎉 na mensagem, barra cheia
- Filtro de mes com `Select` no canto superior direito do card

#### 2. `generateCommissionPDF` em `pdfGenerators.ts`

Funcao que recebe os pedidos filtrados e gera PDF com jsPDF:

- **Cabecalho**: "Relatorio de Comissao — Rancho Chique / Site — Mes/Ano"
- **Tabela** com colunas: Nº do Pedido | Data do Pedido | Quantidade (sequencial)
- **Rodape da tabela**: Total de pedidos, Comissao por pedido (R$10), Valor total
- **Nome do arquivo**: `Comissao - Rancho Chique - MM-YYYY.pdf`
- Seguir mesmo padrao de fonte, margens e paginacao dos outros relatorios

#### 3. `Index.tsx`

No `renderVendedorDashboard`, quando `isSiteUser`:
- Adicionar `<CommissionPanel orders={orders} />` apos o card "Botas na producao"

