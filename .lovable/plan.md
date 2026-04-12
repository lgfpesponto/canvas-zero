

## Plano: Substituir "Vínculo" por "Tipo" no botão "+ campo" da Bota

### O que muda

No dialog "+ campo" da ficha de Bota (linhas 1572-1624), o campo **"Vínculo"** (Nenhum / Cálculo de Preço / Numeração) será substituído por **"Tipo"** com as opções que fazem sentido para o usuário:

- **Tem/Não tem** — como o campo "Nome Bordado" (toggle sim/não)
- **Variação** — como "Tipo de Couro" (seleção única)
- **Múltipla escolha** — como "Bordados" (seleciona vários)
- **Texto** — como "Vendedor" (campo de texto livre)

### Alterações em `src/pages/AdminConfigFichaPage.tsx`

1. **Criar constante `TIPOS_CAMPO_BOOT`** com os 4 tipos na linguagem do usuário:
   - `{ value: 'toggle', label: 'Tem/Não tem' }`
   - `{ value: 'variacao', label: 'Variação (escolha única)' }`
   - `{ value: 'multipla', label: 'Múltipla escolha' }`
   - `{ value: 'texto', label: 'Texto' }`

2. **No estado `novoItem`** (linha 1355): substituir `vinculo` por `tipo` (valor padrão `'variacao'`)

3. **No dialog** (linhas 1603-1608): trocar o Select de "Vínculo" por "Tipo" usando `TIPOS_CAMPO_BOOT`

4. **No reset** (linha 1448): trocar `vinculo: ''` por `tipo: 'variacao'`

5. **No handler `handleAddItem`**: mapear o `tipo` selecionado para o campo correto no banco (o `vinculo` do banco receberá `null`, e o campo será criado com o tipo adequado)

