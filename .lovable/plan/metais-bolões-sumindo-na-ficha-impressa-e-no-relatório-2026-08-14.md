# Metais (bolões) sumindo na ficha impressa e no relatório

## O que está acontecendo
A ficha exibida no portal usa uma função (`orderFichaCategories`) que já trata Bola Grande, mas a **ficha impressa em PDF** usa outro trecho de código próprio, que está desatualizado:

- Não considera Bola Grande em lugar nenhum (nem para decidir se a seção METAIS aparece, nem para imprimir a quantidade).
- Só imprime a linha "Metais:" quando o campo **Área do metal** está preenchido. Nos pedidos do Rancho Chique (site) que vêm com Tipo/Cor do metal sem área, o bloco METAIS sai com o título e **sem nenhum texto** — exatamente como na foto enviada.

O **Relatório de Metais** tem o mesmo problema parcial: lista Área, Tipo, Cor, Strass, Cruz e Bridão, mas não mostra Bola Grande nem Cavalo, e o filtro que decide quais pedidos entram no relatório também ignora esses dois — então um pedido que só tenha bolão pode ficar de fora.

## Correção
1. Ficha impressa (PDF): usar a mesma regra da ficha do portal — incluir Bola Grande na detecção de metais e na linha de quantidades (`bola grande xN`), e imprimir a linha "Metais:" sempre que houver área, tipo ou cor (não só área).
2. Relatório de Metais: incluir `Bola Grande: N un.` e `Cavalo: N un.` na descrição e no critério de seleção dos pedidos.

## Técnico
- `src/lib/pdfGenerators.ts` (bloco METAIS, ~linhas 411–431): usar `getBolaGrandeQtd(order)` de `@/lib/bolaGrande` em `hasMetalData` e nos `metalExtras`; trocar a condição `if (order.metais)` por `if (order.metais || order.tipoMetal || order.corMetal)` montando as partes existentes.
- `src/components/SpecializedReports.tsx` (`generateMetaisPDF`, ~linhas 835–876): acrescentar Bola Grande (via `getBolaGrandeQtd`) e Cavalo (`extraDetalhes.cavaloMetalQtd`) ao `hasMetals` e ao `metalParts`.

Sem mudanças de dados ou de preço — apenas o que é exibido/impresso.
