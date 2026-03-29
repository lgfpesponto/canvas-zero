

## Edição do PDF da Ficha de Produção

### Alterações

**Arquivo**: `src/pages/ReportsPage.tsx`

#### 1. Nome do arquivo PDF (linha 652)
Substituir `'fichas-producao.pdf'` por nome dinâmico com data e hora:
```
Fichas de Produção - DD-MM-YYYY - HHhMM.pdf
```
Usar `new Date()` para gerar data e hora no momento do save.

#### 2. Canhoto de montagem (Stub 3, linhas 628-649)
- **Remover** `| pedido: ${orderNumClean}` da `stub3Line2` (linha 639)
- **Aumentar fontes** e usar **bold**:
  - Linha 1 (tamanho + solado + cor sola + forma): de `8pt normal` para `9pt bold`
  - Linha 2 (bico + vira): de `7pt normal` para `8pt bold`
- **Reorganizar espaçamento** vertical: como o texto "pedido: X" foi removido e o espaço ficou livre, redistribuir as linhas de texto para ficarem mais espaçadas e legíveis acima do código de barras
- **Manter** o código de barras e o número do pedido abaixo dele (linhas 645-649) inalterados

