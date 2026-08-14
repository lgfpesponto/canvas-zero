# Expandir: foco no campo de pesquisa e setas para as variações

No pop-up "expandir" das variações (ex.: Bordado do Cano), o foco hoje vai direto para a primeira variação. Passa a funcionar assim:

- Ao abrir, o cursor já fica no campo **"Pesquisar variação..."**, pronto para digitar.
- **Seta para baixo** (ou seta para a direita) a partir da busca desce para a primeira variação da página.
- Dentro das variações, as setas continuam andando entre elas, com virada de página automática no fim/início, e o **Enter** marca/desmarca.
- **Seta para cima** na primeira linha de variações volta o foco para o campo de busca.
- Ao trocar de página pelo teclado, o foco continua nas variações (primeira ou última, conforme a direção) — só na abertura o foco é da busca.
- Esc continua fechando o pop-up.

## Detalhes técnicos

- `src/components/ficha/VariacaoExpandirDialog.tsx`: adicionar `inputRef` no `Input` de busca; no efeito de foco automático, focar a busca quando o diálogo abre (`open` mudou) e só focar cards quando a mudança veio de troca de página (`focoPendente`).
- Adicionar `onKeyDown` no input: `ArrowDown`/`ArrowRight` → `focarCard(0)` com `preventDefault`.
- Em `onCardKeyDown`, quando `ArrowUp` e o card estiver na primeira linha (idx < colunas, 1 no mobile / 3 no desktop), focar o input em vez de trocar de página.
