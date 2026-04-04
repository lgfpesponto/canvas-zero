

## Ajustes no Sistema de Grade de Estoque

### Problemas identificados

1. **Grade submete imediatamente**: Ao confirmar a grade, o `onConfirm` já chama `addOrderBatch` e cria os pedidos. Deveria apenas salvar os itens da grade e voltar para a ficha, permitindo preencher campos obrigatórios restantes (ex: link da foto).

2. **Formato do número errado**: Atualmente gera `E00135` + sequência (`E001351`, `E001352`...). O formato correto deve ser: `número base` + `tamanho` + `quantidade sequencial com 2 dígitos`. Ex: `E001` (base) + `35` (tamanho) + `01` (1º pedido) = `E0013501`.

3. **Ordenação**: Após gerar, os pedidos devem aparecer em ordem crescente na lista.

### Alterações

#### 1. `src/pages/OrderPage.tsx` — Separar confirmação da grade do envio

- O `onConfirm` do `GradeEstoque` passa a apenas salvar os itens no estado (`setGradeItems(items)`) e fechar o modal. **Não chama mais `addOrderBatch`**.
- A lógica de criação em massa (`addOrderBatch`) é movida para o botão **"CONFERIR E FINALIZAR"** (submit da ficha), que já valida campos obrigatórios como fotos.
- Quando vendedor é "Estoque" e `gradeItems.length > 0`, o submit chama `addOrderBatch` ao invés de `addOrder`.

#### 2. `src/contexts/AuthContext.tsx` — Novo formato de numeração

Alterar a geração de números na função `addOrderBatch`:

```
Formato atual:   E00135 + 1, 2, 3...  → E001351, E001352
Formato correto: E001 + 35 + 01       → E0013501
                 E001 + 35 + 02       → E0013502
                 E001 + 36 + 01       → E0013601
```

Para cada tamanho, a quantidade sequencial reinicia em `01`. Usar zero-padding de 2 dígitos para a sequência.

#### 3. `src/components/GradeEstoque.tsx` — Atualizar preview

Atualizar a geração de `previewNumbers` para usar o novo formato (base + tamanho + seq). O componente não precisa de outras mudanças.

#### 4. Ordenação na lista de pedidos

Após inserir, os pedidos são adicionados ao estado com `setOrders`. A lista em `ReportsPage` já ordena por `created_at` desc. Para garantir ordem crescente por número dentro da grade, inverter a ordem do array `mapped` antes de adicionar ao estado (pedidos com número menor primeiro = criados primeiro no array).

### Fluxo corrigido

```text
1. Preencher ficha (modelo, couros, etc.)
2. Clicar "Gerar Grade" no campo Tamanho
3. Definir tamanhos e quantidades → Confirmar
4. Volta para a ficha com resumo da grade no campo
5. Preencher campos restantes (fotos, obs, etc.)
6. Clicar "CONFERIR E FINALIZAR" → valida tudo → gera pedidos
7. Redirecionado para "Meus Pedidos"
```

