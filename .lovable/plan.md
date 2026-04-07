

## Prevenir criação de pedidos duplicados (race condition no botão Finalizar)

### Causa do problema

O botão "OK — FINALIZAR" no espelho da ficha de produção chama `confirmOrder` sem nenhum estado de loading/disabled. Se o usuário clicar duas vezes rapidamente (ou a rede estiver lenta), duas chamadas paralelas executam a verificação de duplicata **antes** de qualquer insert completar — ambas passam na verificação e ambas inserem o mesmo número.

O mesmo problema existe no `addOrder` e `addOrderBatch` do `AuthContext.tsx`: a verificação de duplicata e o insert não são atômicos.

### Solução (duas camadas de proteção)

#### 1. Botão com estado de loading (OrderPage.tsx)
- Adicionar estado `const [submitting, setSubmitting] = useState(false)`
- No `confirmOrder`: no início, verificar `if (submitting) return` e setar `setSubmitting(true)`, no finally setar `setSubmitting(false)`
- No botão "FINALIZAR": adicionar `disabled={submitting}` e mostrar texto "Salvando..." quando submitting

#### 2. Unique constraint no banco de dados (proteção definitiva)
- Criar migration SQL: `CREATE UNIQUE INDEX IF NOT EXISTS orders_numero_unique ON orders (numero);`
- Isso garante que mesmo com race condition, o banco rejeita o segundo insert

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/OrderPage.tsx` | Estado `submitting` para desabilitar botão durante salvamento |
| `src/pages/BeltOrderPage.tsx` | Mesmo padrão de `submitting` no formulário de cintos |
| `src/pages/ExtrasPage.tsx` | Mesmo padrão de `submitting` no formulário de extras |
| Migration SQL | `CREATE UNIQUE INDEX` na coluna `numero` da tabela `orders` |

