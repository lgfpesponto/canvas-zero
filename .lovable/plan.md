

## Mover "Fivela" para depois de "Couro" e tornar obrigatório

### Alterações

**Arquivo**: `src/pages/BeltOrderPage.tsx`

1. **Mover seção Fivela**: Recortar o bloco `{/* Fivela */}` (linhas ~395-408) e colar logo após o fechamento da seção "Couro" (após linha ~323), antes da seção "Bordado P".

2. **Tornar obrigatório**: Na validação `handleSubmit` (linha ~126-131), adicionar `[fivela, 'Fivela']` ao array `required`.

3. **Label obrigatório**: Alterar o placeholder do select de "Sem fivela" para "Selecione..." e adicionar asterisco vermelho no título ou no label, igual aos outros campos obrigatórios.

