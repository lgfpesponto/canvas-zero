

## Substituir campo Tamanho pelo painel de Grade quando vendedor for "Estoque"

### O que muda

Quando o vendedor selecionado for "Estoque", o campo `SelectField` de **Tamanho** (linha 711) será substituído inline por um botão/painel de **Grade de Estoque** diretamente na ficha de produção. O botão separado "GERAR GRADE" (linhas 969-1004) será removido.

### Arquivo: `src/pages/OrderPage.tsx`

#### 1. Substituir o campo Tamanho condicionalmente

Na seção "Tamanho + Gênero + Modelo" (linha 708-714), quando `isAdmin && vendedorSelecionado === 'Estoque'`:
- No lugar do `SelectField` de Tamanho, renderizar um botão "Gerar Grade" estilizado como um campo de formulário (com label "Tamanho/Grade" e visual consistente)
- Se a grade já foi preenchida, mostrar um resumo inline (ex: "5 tamanhos, 12 pedidos") com botão para editar
- Os campos Gênero e Modelo continuam normais ao lado

#### 2. Remover o botão separado "GERAR GRADE"

Remover o bloco condicional das linhas ~969-1004 que exibe o botão "GERAR GRADE" separado.

#### 3. Armazenar estado da grade no formulário

Adicionar estado `gradeItems` para manter os itens da grade preenchidos. Quando a grade é confirmada no modal `GradeEstoque`, salvar os items no estado para exibir o resumo inline no campo.

#### 4. Ajustar validação

- Quando vendedor é "Estoque", a validação do submit principal deve verificar se `gradeItems` tem itens válidos ao invés de exigir o campo `tamanho`
- Na validação do botão de grade inline, não precisa mais da validação separada — o fluxo é direto

### Resultado visual

```text
Vendedor normal:          Vendedor "Estoque":
┌──────────┐              ┌─────────────────────┐
│ Tamanho ▼│              │ 📊 Gerar Grade      │
├──────────┤              │ (ou resumo da grade) │
│ Gênero  ▼│              ├─────────────────────┤
│ Modelo  ▼│              │ Gênero  ▼           │
└──────────┘              │ Modelo  ▼           │
                          └─────────────────────┘
```

