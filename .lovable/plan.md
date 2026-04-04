

## Sistema de Grade de Estoque

### Resumo

Quando o vendedor "Estoque" for selecionado, adicionar um botão "Gerar Grade" que abre um painel para definir tamanhos e quantidades. O sistema gera automaticamente pedidos individuais a partir da ficha preenchida, cada um com número sequencial e código de barras próprio.

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/GradeEstoque.tsx` | **Novo** — componente do painel de grade |
| `src/pages/OrderPage.tsx` | Adicionar botão "Gerar Grade" + lógica de geração em massa |
| `src/contexts/AuthContext.tsx` | Adicionar função `addOrderBatch` para inserir múltiplos pedidos |

### Detalhes

#### 1. Componente `GradeEstoque.tsx` (novo)

Dialog/modal com:
- Tabela editável com duas colunas: **Tamanho** (select dos tamanhos disponíveis) e **Quantidade** (input numérico)
- Botão "Adicionar tamanho" para novas linhas
- Botão "Remover" por linha
- Ao confirmar, ordenar tamanhos em ordem crescente e mostrar **pré-visualização**:
  - Número base do pedido
  - Lista de tamanhos com quantidade
  - Total de pedidos a serem criados
- Dois botões finais: "Confirmar geração da grade" e "Cancelar"

#### 2. `OrderPage.tsx` — Integração

- Mostrar botão **"Gerar Grade"** ao lado do botão de submit quando `vendedorSelecionado === 'Estoque'`
- O botão "Gerar Grade" executa a mesma validação do formulário (campos obrigatórios, bordados, etc.) exceto o campo **Tamanho** (que será definido na grade)
- Ao confirmar a grade, chamar `addOrderBatch` passando os dados da ficha + array de `{ tamanho, quantidade }`
- Formato dos números: `numeroPedido` + sequência (ex: `E00135` → `E001351`, `E001352`, ...)

#### 3. `AuthContext.tsx` — Função `addOrderBatch`

Nova função que recebe:
- `orderData` (dados base da ficha, sem tamanho)
- `gradeItems: { tamanho: string; quantidade: number }[]`
- `numeroPedidoBase: string`

Lógica:
1. Ordenar `gradeItems` por tamanho crescente
2. Gerar sequência: para cada item, criar `quantidade` pedidos com tamanho fixo
3. Numerar sequencialmente: `${numeroPedidoBase}1`, `${numeroPedidoBase}2`, ...
4. Verificar duplicatas para todos os números antes de inserir
5. Inserir todos de uma vez com `supabase.from('orders').insert(rows).select()`
6. Cada pedido recebe seu próprio UUID → código de barras individual automático
7. Todos herdam exatamente os mesmos campos da ficha original (modelo, couros, solado, bico, bordados, etc.)
8. Todos são atribuídos ao admin (padrão "Estoque")

#### 4. Fluxo do usuário

```text
1. Selecionar vendedor "Estoque"
2. Preencher ficha normalmente (ou usar modelo)
3. Preencher número do pedido base (ex: E00135)
4. Clicar "Gerar Grade"
5. Definir tamanhos e quantidades
6. Ver pré-visualização com total
7. Confirmar → pedidos criados individualmente
8. Redirecionado para "Meus Pedidos"
```

#### 5. Regras importantes

- O campo **Tamanho** da ficha fica desabilitado/opcional quando "Estoque" está selecionado (será definido na grade)
- Modelos continuam funcionando normalmente — preenche a ficha, depois gera a grade
- Validação de número duplicado verifica todos os números gerados antes de inserir qualquer um
- Se algum número já existir, bloqueia e mostra erro

