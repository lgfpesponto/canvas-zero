# Metais: Área do Metal comanda Tipo e Cor

## Comportamento novo
Na categoria Metais, ao escolher a Área do Metal:

- **Não tem** → os campos Tipo do Metal e Cor do Metal são ignorados pela navegação por Enter (o foco vai direto para Strass) e ficam limpos (Rebite desmarcado, cor vazia).
- **Metade da Bota / Inteira** → o Tipo do Metal já vem com **Rebite** marcado automaticamente e o Enter pula direto para **Cor do Metal**; depois segue normalmente para Strass, Bola Grande, Cruz, Bridão, Cavalo.

O usuário continua podendo marcar/desmarcar Rebite ou outros tipos com o mouse; a marcação automática só acontece quando a área muda de "Não tem"/vazio para Metade/Inteira.

## Detalhes técnicos
- `src/pages/OrderPage.tsx`, seção METAIS:
  - Envolver o bloco de checkboxes de Tipo do Metal com `data-ficha-nav-skip="true"` para que a navegação por Enter nunca pare nas checkboxes individuais.
  - Efeito ao mudar `areaMetal`: se `Não tem` (ou vazio) → `setTipoMetal([])` e `setCorMetal('')`; se Metade/Inteira e `tipoMetal` estiver vazio → `setTipoMetal(['Rebite'])`.
  - Quando `areaMetal === 'Não tem'`, marcar o select de Cor do Metal com `data-ficha-nav="false"` (ou desabilitá-lo para navegação) para o Enter pular para Strass.
- Sem alteração de preço ou regra de negócio; apenas fluxo de preenchimento.
