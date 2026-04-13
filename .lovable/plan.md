
Descobri o motivo de ainda não funcionar.

Problema principal
- O botão de editar existe e o `openEditPanel` é chamado.
- Mas em `BootFieldRenderer` o modal `<Dialog>` de edição está renderizado apenas no fluxo final usado por campos `multipla`.
- Os campos `Tamanho`, `Gênero` e `Modelo` são do tipo `selecao`.
- No ramo `if (campo.tipo === 'selecao')`, o componente faz `return` antes do bloco do `<Dialog>`.
- Resultado: ao clicar no lápis, `showVarPanel` muda para `true`, mas não existe nenhum modal montado para esse tipo de campo.

Evidência no código
- `src/pages/AdminConfigFichaPage.tsx:1124-1130`
  - `openEditPanel()` define `setShowVarPanel(true)`
- `src/pages/AdminConfigFichaPage.tsx:1291-1300`
  - ramo de `campo.tipo === 'selecao'` retorna antes
- `src/pages/AdminConfigFichaPage.tsx:1338-1380`
  - o `<Dialog open={showVarPanel}>...` só aparece depois, no retorno do fluxo de `multipla`

Por que parecia ser outra coisa
- O fallback de slug singular/plural (`tamanho -> tamanhos`, etc.) realmente precisava existir e continua importante para montar as opções.
- Os warnings de `ref` em `SearchableSelect` e `Dialog` também são reais.
- Mas o bloqueio funcional mais direto agora é estrutural: para `selecao`, o editor simplesmente não está no JSX retornado.

Plano de correção
1. Extrair o modal de edição de variações para um bloco compartilhado dentro de `BootFieldRenderer`
   - usar o mesmo modal para `selecao` e `multipla`
   - manter suporte a itens fallback “não salvos”

2. Reestruturar o retorno do `BootFieldRenderer`
   - evitar `return` antecipado em `selecao` sem incluir o modal
   - renderizar:
     - label
     - controles admin
     - preview específico do tipo
     - modal compartilhado

3. Preservar a lógica já existente
   - manter merge entre fallback + banco
   - manter `LEGACY_SLUG_MAP` para `tamanho`, `genero`, `modelo`
   - manter ordenação alfabética no preview e na lista de edição

4. Corrigir o warning restante do `SearchableSelect`
   - revisar `PopoverTrigger asChild` para garantir que o trigger receba `ref` corretamente
   - se necessário, transformar o botão interno em componente com `forwardRef` ou simplificar a estrutura do trigger

5. Validar os três casos afetados
   - `Tamanho`
   - `Gênero`
   - `Modelo`
   - confirmar abrir, editar, salvar, adicionar e apagar

Detalhes técnicos
```text
Hoje:
campo tipo = selecao
-> botão chama openEditPanel()
-> setShowVarPanel(true)
-> componente retorna antes do <Dialog>
-> nenhum modal aparece

Depois:
campo tipo = selecao ou multipla
-> botão chama openEditPanel()
-> modal compartilhado sempre está montado
-> editor abre normalmente
```
