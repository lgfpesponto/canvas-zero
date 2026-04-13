
Descobri por que ainda não funciona.

O problema principal não é mais só “clique” nem só o modal: a lógica continua incompleta para os campos legados da bota.

1. Causa real que ainda sobra
- O `BootFieldRenderer` abre o editor usando apenas `activeVars`, que vem de `variacoes`.
- Essas `variacoes` são montadas assim:
  - primeiro por `campo_id`
  - se vazio, tenta fallback por `campo.slug === categoria.slug`
- Mas os campos problemáticos costumam usar slug singular no campo:
  - `tamanho`, `genero`, `modelo`
- E os fallbacks/categorias da bota usam slug plural:
  - `tamanhos`, `generos`, `modelos`
- Então esse fallback falha para esses 3 casos. Resultado:
  - `fieldVars` fica vazio
  - `activeVars` fica vazio
  - o botão “editar variações” não tem itens para abrir corretamente

2. Evidência no código
- Fallback atual:
  - `src/pages/AdminConfigFichaPage.tsx:878-885`
- Ele procura categoria com:
  - `categorias.find(c => c.slug === campo.slug)`
- Só que os fallbacks oficiais estão em:
  - `BOOT_FALLBACK_MAP`
  - `tamanhos`, `generos`, `modelos`
  - `src/pages/AdminConfigFichaPage.tsx:1768-1771`
- O editor funcional de fallback já existe em outro lugar:
  - `AdminEditableOptions`
  - ele faz merge entre fallback + banco e trata item “não salvo”
  - `src/pages/AdminConfigFichaPage.tsx:210-374`
- O `BootFieldRenderer` não reaproveita essa lógica; ele só trabalha com registros já resolvidos em `variacoes`.

3. Fator secundário real
- Ainda existe warning de ref no console:
  - `Badge` está sendo usado de forma que algum componente pai tenta passar `ref`
  - `Dialog` também aparece no stack
- Isso é ruído real e deve ser corrigido, mas não explica sozinho por que só `Tamanho`, `Gênero` e `Modelo` falham.
- O bug funcional principal é a incompatibilidade de slugs + ausência de merge fallback no `BootFieldRenderer`.

4. O que precisa ser feito
- Criar um resolvedor explícito para campos legados da bota:
  - `tamanho -> tamanhos`
  - `genero -> generos`
  - `modelo -> modelos`
- Fazer o `BootFieldRenderer` receber uma lista mesclada:
  - variações persistidas por `campo_id`
  - ou por categoria
  - mais fallbacks do `BOOT_FALLBACK_MAP`
- Fazer o editor de variações da bota suportar também itens fallback “não salvos”, igual ao `AdminEditableOptions`
- Ao salvar:
  - atualizar os itens já persistidos
  - inserir no banco os itens fallback editados
  - permitir apagar fallback convertendo-o em registro inativo, igual ao fluxo já existente
- Manter ordenação alfabética em:
  - preview
  - lista de edição
  - resultado salvo

5. Ajustes adicionais
- Corrigir `DialogHeader` e `DialogFooter` para `forwardRef` em `src/components/ui/dialog.tsx`
- Garantir `DialogDescription` em todos os modais relevantes
- Revisar `Badge` se algum wrapper estiver tentando aplicar `ref` nele dentro do modal/lista

6. Resultado esperado
- “Tamanho”, “Gênero” e “Modelo” passam a abrir o editor corretamente
- editar, apagar e adicionar variações volta a funcionar nesses campos
- itens fallback passam a ser tratados como editáveis mesmo antes de estarem salvos no banco
- tudo continua em ordem alfabética

Detalhes técnicos
```text
Hoje:
campo.slug = tamanho/genero/modelo
fallback slug = tamanhos/generos/modelos
comparação exata falha
=> variacoes vazias
=> editor inconsistente

Depois:
campo legado -> mapa de slug legado
             -> merge fallback + banco
             -> editor da bota com suporte a itens não salvos
             -> persistência correta ao salvar
```
