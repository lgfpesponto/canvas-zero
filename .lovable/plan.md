## Objetivo

No PDF do **Relatório de Corte**, após a última linha da tabela principal, acrescentar uma seção **"Acessórios"** com linhas extras (mesma tabela / mesmas 4 colunas: Nº PEDIDO · DESCRIÇÃO DO CORTE · QR CODE · CHECK).

O pedido continua aparecendo normalmente na lista principal — e, **se tiver Kit Canivete ou Kit Faca nos acessórios, aparece novamente** dentro da seção "Acessórios" (linha duplicada, propositalmente).

## Alterações

Arquivo único: `src/components/SpecializedReports.tsx`, função `generateCortePDF` (~linhas 1068–1196). Nada muda antes do `stampPageNumbers`; só é acrescentado um bloco novo depois do loop principal.

1. Após o `for (const o of filtered) { … }`, filtrar do próprio `filtered`:
   ```ts
   const acessOrders = filtered.filter(o => {
     const s = (o.acessorios || '').toLowerCase();
     return s.includes('kit faca') || s.includes('kitfaca')
         || s.includes('kit canivete') || s.includes('kitcanivete');
   });
   ```
2. Se `acessOrders.length > 0`:
   - Se `y` estiver perto do fim da página → `doc.addPage(); y = 20;`. Caso contrário, `y += 6`.
   - Título de seção **"Acessórios"** (helvetica bold, 11pt) em `mx, y`; `y += 6`.
   - Redesenhar o cabeçalho da tabela via `drawTableHeader(doc, y, mx, cw, [...])` com os mesmos rótulos/`cx` já usados acima.
3. Para cada `o` em `acessOrders`, montar `parts` **apenas** com:
   - Os itens de `o.acessorios` que contenham "kit faca"/"kitfaca"/"kit canivete"/"kitcanivete" (split por vírgula, filtro case-insensitive, mantendo o texto original).
   - `Cano: ${o.couroCano || ''} ${o.corCouroCano || ''}` (só se algum estiver preenchido).
   - `Obs: ${o.observacao}` (só se preenchido).
   Renderizar a linha idêntica às da tabela principal: mesmo cálculo de `rowH`, mesma quebra de página, código de barras + nº do pedido na coluna 1, descrição 6pt na coluna 2, QR na coluna 3 (a partir de `o.fotos?.[0]`), checkbox na coluna 4.
4. Nada muda em: filtros de origem, ordenação da lista principal, `recordPrintHistory`, `registrarPdfSnapshot`, layout/colunas, outros relatórios.

## Regras respeitadas

- Só leitura/apresentação; nenhum dado de pedido é alterado.
- Seção só aparece se houver pedidos com kitfaca/kitcanivete.
- Continua respeitando os mesmos filtros (progresso + período) já aplicados ao relatório.