## Objetivo
Listar aqui no chat todos os **538 pedidos** atualmente em Pesponto 01–10 (excluindo Pespontando e Pesponto Ailton) e gerar um PDF exportável.

## O que farei ao entrar em build mode
1. Rodar um script Python com os dados já consultados (3 lotes de 200 pedidos com filtro `status LIKE 'Pesponto%'`, `tipo_extra IS NULL`, `estoque_pronto = false`) e filtrar apenas `Pesponto NN`.
2. Ordenar por `data_criacao` ASC → `numero` ASC.
3. Imprimir aqui no chat a lista completa em 3 colunas (Nº · Data · Progresso).
4. Gerar `/mnt/documents/Pesponto - Todos - {data}.pdf` com reportlab (mesmas 3 colunas, layout compacto, cabeçalho repetido a cada página, total no rodapé).
5. Entregar via `<presentation-artifact>` para download.

## Fora de escopo
Nada de mudança em arquivos do portal, edge functions ou banco.

Aprove para eu gerar.
