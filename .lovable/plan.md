

## Melhorias nos Quadros de Solados (SoladoBoard)

### Resumo

Reorganizar o layout dos cards de pedidos, adicionar botao "Selecionar todos", melhorar descricao da sola com labels, e reformular o PDF para seguir o modelo de Escalacao (blocos com tamanhos e quantidades agrupados por configuracao de sola).

### Alteracoes no componente `src/components/SoladoBoard.tsx`

#### 1. Botao "Selecionar todos" no topo

Adicionar um botao ao lado dos outros botoes do cabecalho que seleciona/deseleciona todos os pedidos visiveis de uma vez.

#### 2. Novo layout de cada card de pedido

Reorganizar para:
- **Linha 1:** Numero do pedido + Vendedor
- **Linha 2:** Descricao da sola com labels explicativos
- **Linha 3:** Prazo restante | Progresso (badge) | Data — alinhados horizontalmente, acima do botao Feito
- **Botao Feito** abaixo das informacoes (nao mais ao lado)

#### 3. Descricao da sola com labels

Mudar de `37 | feminino | borracha | quadrado | preto | rosa | 2300` para:

```
Tamanho: 37  Genero: Feminino  Tipo: Borracha  Formato: Quadrado  Cor: Preto  Vira: Rosa  Forma: 2300
```

#### 4. PDF no modelo de Escalacao

Substituir o PDF atual (lista de pedidos individuais) por um PDF agrupado tipo ficha de pedido de solas:
- Agrupar pedidos visiveis por configuracao de sola (solado + formato bico + cor sola + cor vira)
- Cada grupo vira um bloco usando `drawBlockLayout` (titulo escuro, linha TAM., linha QTD.)
- Badge: nome do quadro (ex: "SOLA COURO")
- Descricao: concatenacao da configuracao da sola
- Cabecalho com titulo, data e total de pares
- Reutilizar as funcoes `BlockData`, `drawBlockLayout` e `estimateBlockHeight` (copiar do SpecializedReports ou extrair para utils)

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/components/SoladoBoard.tsx` | Layout reorganizado, botao selecionar todos, descricao com labels, PDF agrupado tipo Escalacao |

