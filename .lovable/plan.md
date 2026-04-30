## Objetivo

Reordenar as seções da página de detalhe do pedido (`src/pages/OrderDetailPage.tsx`) para que a **Composição do Pedido** (com o bloco de Aplicar Desconto do admin_master) apareça **antes** dos históricos (Produção, Alterações e Impressão).

## Ordem atual

1. Cabeçalho / Conferido
2. Histórico de Produção + Histórico de Alterações (grid 2 colunas)
3. Histórico de Impressão
4. Detalhes da Bota / Extra
5. Observação
6. Fotos
7. **Composição do Pedido** + Aplicar Desconto

## Ordem desejada

1. Cabeçalho / Conferido
2. Detalhes da Bota / Extra
3. Observação
4. Fotos
5. **Composição do Pedido** + Aplicar Desconto
6. Histórico de Produção + Histórico de Alterações
7. Histórico de Impressão

## Mudança técnica

Em `src/pages/OrderDetailPage.tsx`:

- Recortar o bloco das **linhas ~668–747** (grid de Histórico de Produção + Alterações + Histórico de Impressão).
- Colar esse bloco **logo após** o fechamento do bloco "Composição do Pedido + Aplicar Desconto" (após a linha ~1093, antes do `</div>` que fecha o card principal na linha 1094).

Nenhuma lógica, props, hook ou estilo é alterado — apenas a ordem JSX. Não há impacto em PDFs, relatórios ou em outras páginas (Edit/Belt/Extras).

## Fora do escopo

- Não alterar layout interno de cada seção.
- Não alterar a página de impressão / PDF.
- Não alterar o detalhe de pedidos extras/cintos em outros locais.
