# OK no expandir avança para o próximo campo

No pop-up "expandir" das variações, ao clicar em **OK** (ou fechar pelo X/Esc já não), o pop-up fecha e o foco vai direto para o próximo campo da ficha, seguindo a mesma ordem do Enter.

- Botão **OK**: fecha o pop-up e pula para o próximo campo ainda vazio.
- Fechar por **Esc** ou pelo X: apenas fecha e devolve o foco ao campo de origem, sem avançar (evita pular sem querer).

## Detalhes técnicos

- `src/components/ficha/VariacaoExpandirDialog.tsx`: nova prop opcional `onConfirm?: () => void`; o botão OK chama `onOpenChange(false)` e em seguida `onConfirm?.()`.
- `src/pages/OrderPage.tsx` (`MultiSelect`): passar `onConfirm` que, após um `setTimeout(0)` (para o diálogo devolver o foco), chama `focusNextFrom(searchRef.current ?? gridRef.current)` de `@/lib/fichaNav`.
