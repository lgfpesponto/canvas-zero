# Melhorar paginação em "Meus Pedidos"

## O que muda

Hoje, na parte inferior da lista de "Meus Pedidos" (`/relatorios`), só existem dois botões: **Anterior** e **Próxima**, com o texto "Página X de Y" no meio. Quando há muitas páginas, é cansativo clicar várias vezes.

A nova paginação vai ter, na seguinte ordem:

```text
[ « Primeira ]  [ ‹ Anterior ]   Página [ 11 ] de 15   [ Ir ]   [ Próxima › ]  [ Última » ]
```

- **Primeira**: vai direto para a página 1.
- **Anterior**: igual ao atual (página -1).
- **Campo de número**: input editável onde o usuário digita o número da página desejada (ex.: 11). Aceita Enter para confirmar.
- **Botão "Ir"**: confirma o salto para a página digitada (alternativa ao Enter).
- **de 15**: mostra o total de páginas (igual hoje).
- **Próxima**: igual ao atual (página +1).
- **Última**: vai direto para a última página (`totalPages`).

Validações:
- Se o usuário digitar um número inválido (menor que 1, maior que o total, ou texto), o salto é ignorado e o campo volta para a página atual.
- Os botões "Primeira" e "Anterior" ficam desabilitados na página 1.
- Os botões "Próxima" e "Última" ficam desabilitados na última página.
- Mantém o mesmo estilo visual atual (botões com borda laranja).

## Onde mexer

- `src/pages/ReportsPage.tsx` — substituir o bloco de paginação (linhas ~1143-1163) pelo novo layout com input e os 4 botões. Aproveitar o `handlePageChange` que já existe (faz scroll para o topo).

Nenhuma alteração de banco, nenhuma outra página afetada.
