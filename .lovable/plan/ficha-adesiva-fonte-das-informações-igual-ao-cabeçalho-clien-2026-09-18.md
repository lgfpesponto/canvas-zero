# Ficha Adesiva — fonte das informações igual ao cabeçalho + cliente ausente sem linha vazia

Arquivo: `src/lib/fichaAdesivaPdf.ts` (apenas este).

## 1. Tamanho da fonte do corpo igual ao cabeçalho
- O texto das seções (OBSERVAÇÃO, PESPONTO, ACESSÓRIOS, METAIS, EXTRAS) começa com a mesma fonte do cabeçalho (`headerFontSize`, hoje 10.8) em vez de 9.6.
- O título da seção também usa esse tamanho (mantém a hierarquia atual, tudo bold).
- `lineHeight` inicial acompanha a fonte (≈ 10.8 × 0.43).
- Mantém o encolhimento automático que já existe: se o conteúdo não couber no espaço acima do canhoto, a fonte desce gradualmente como hoje — nunca corta nem sobrepõe.

## 2. Sem "Cliente: —" para vendedores sem cliente
- O cabeçalho passa a ter duas colunas independentes em vez de pares fixos:
  - Coluna 1: Código, Data, Tamanho (sempre 3 linhas).
  - Coluna 2: Vendedor, Cliente (só se vendedor for Stefany / Site / Juliana), Modelo.
- Quando o cliente não aparece, a coluna 2 fica com 2 linhas (Vendedor, Modelo) — sem rótulo "Cliente:" vazio e sem linha em branco; o Modelo sobe para a linha do meio.
- Cada coluna flui com a sua própria altura (quebra de linha do Modelo desloca só a coluna 2).

## Validação
- Typecheck (`bunx tsgo --noEmit -p tsconfig.app.json`) e build.
- QA visual com Playwright gerando amostras de bota (com e sem cliente, modelo longo que quebra linha) e cinto; conferir PNG via `pdftoppm` sem cortes/sobreposições.
