

## Plano: Substituir "Vínculo" por "Tipo" no dialog "+ campo"

### O que muda

No dialog "novo campo" (linhas 1691-1751), o campo "Vínculo" (com opções Nenhum/Cálculo de Preço/Numeração) será removido e substituído pelo campo "Tipo" que já existe na primeira linha do grid mas está ao lado do Nome. A ideia é reorganizar para que o "Tipo" fique mais proeminente, com as opções:

- **Texto** (como Nome Bordado - campo de texto livre)
- **Seleção Única** (como Tipo de Couro - escolhe uma opção)
- **Múltipla Escolha** (como Bordados - seleciona vários)
- **Checkbox Sim/Não**

### Alterações em `src/pages/AdminConfigFichaPage.tsx`

1. **Remover o select "Vínculo"** (linhas 1712-1718) do dialog "novo campo"
2. **Remover `vinculo` do estado `novoCampo`** (linha 1353) e do reset (linha 1426)
3. **Remover `vinculo` do payload de insert** (linha 1419) - passar sempre `null`
4. **Mover o select "Tipo"** para ocupar o espaço do Vínculo no segundo grid row, ficando ao lado de "Depende de (relacionamento)"
5. **Reorganizar o layout**: Nome ocupa a linha inteira, e abaixo fica Tipo + Relacionamento lado a lado

O campo "Tipo" já funciona corretamente com TIPOS_CAMPO e já controla a exibição condicional do textarea de opções. Apenas reorganizamos o layout e removemos o Vínculo que confundia o usuário.

