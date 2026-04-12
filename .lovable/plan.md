

## Plano: Editor completo de fichas no Admin Configuracoes

### Resumo

Ao clicar numa ficha existente na aba Configuracoes, abrir uma pagina de edicao completa com todos os campos, categorias e variacoes. Botao "Salvar" no topo sincroniza tudo com o banco. As mudancas refletem automaticamente no formulario "Faca seu pedido" para novos pedidos. Pedidos antigos nao sao afetados.

### Arquitetura

```text
Admin Configuracoes (EDITA)         Faca seu Pedido (SO LE)
       |                                    |
       v                                    v
  ficha_campos  ─────────────────>  DynamicOrderPage
  ficha_categorias ──────────────>  OrderPage (bota)
  ficha_variacoes ───────────────>  lê variações do DB
```

### 1. Migration: adicionar coluna `relacionamento` em `ficha_variacoes`

Adicionar coluna `relacionamento` (jsonb, nullable, default null) na tabela `ficha_variacoes` para armazenar vinculos entre variacoes. Exemplo: modelo "City" teria `relacionamento: { tamanhos: ["34"..."40"], solados: ["borracha-city"], formato_bico: ["quadrado"] }`.

Adicionar tambem coluna `relacionamento` (jsonb, nullable) em `ficha_campos` para definir dependencias entre campos (ex: campo "cor_couro" depende de "tipo_couro").

```sql
ALTER TABLE ficha_variacoes ADD COLUMN IF NOT EXISTS relacionamento jsonb DEFAULT NULL;
ALTER TABLE ficha_campos ADD COLUMN IF NOT EXISTS relacionamento jsonb DEFAULT NULL;
```

### 2. Nova pagina: AdminConfigFichaEditPage

Substituir a pagina atual `AdminConfigFichaPage` por um editor completo:

**Layout:**
- Botao "Salvar alteracoes" fixo no topo
- Lista de categorias com suas variacoes expandiveis inline
- Cada variacao editavel: nome, preco, ativo, ordem, **relacionamento**
- Botao "+" em cada categoria para adicionar variacao
- Botao "+" geral para adicionar nova categoria
- Para fichas dinamicas: lista de campos (ficha_campos) editaveis com reordenacao
- Drag-and-drop ou setas para reordenar categorias e variacoes

**Campo "Relacionamento" na variacao:**
- Ao criar/editar uma variacao, exibir um campo multi-select para cada categoria existente da mesma ficha
- Ex: ao editar modelo "City", mostrar selects para "Tamanhos", "Solados", "Formato do Bico" onde o admin escolhe quais opcoes sao permitidas
- Salva como JSON na coluna `relacionamento`

**Campo "Relacionamento" no campo (ficha_campos):**
- Ao criar/editar um campo, select para escolher "depende de qual campo"
- Ex: campo "cor do couro" depende de "tipo de couro"

**Botao "+" para novo campo (fichas dinamicas):**
- Abre mini-formulario igual ao FichaBuilder: nome, tipo, obrigatorio, opcoes, vinculo, relacionamento
- Insere diretamente em ficha_campos

### 3. Logica de salvamento

- Cada edicao inline faz update imediato no banco (como ja funciona em AdminConfigVariacoesPage)
- Botao "Salvar" no topo faz batch update de ordens e campos modificados
- Nao altera pedidos existentes (eles ja tem dados salvos)

### 4. Formulario de pedido le do banco

Para a ficha **bota**, o OrderPage ja le de `ficha_variacoes` via `useFichaVariacoesLookup` (implementado anteriormente). A coluna `relacionamento` sera usada para filtrar opcoes dinamicamente:

- Quando usuario seleciona um modelo, buscar `relacionamento` dessa variacao
- Filtrar tamanhos, solados, bicos conforme o JSON de relacionamento
- Fallback para logica hardcoded atual se `relacionamento` estiver null (compatibilidade)

Para fichas **dinamicas**, o DynamicOrderPage ja le de `ficha_campos` -- nenhuma mudanca necessaria.

### 5. Pedidos antigos

- Pedidos antigos ja tem valores salvos nas colunas da tabela `orders`
- Ao editar um pedido antigo, o EditOrderPage usa os valores ja salvos
- Novas variacoes nao aparecem em pedidos antigos (os selects mostram o valor atual + opcoes atuais, mas o valor original e preservado)

### Arquivos afetados

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/` | Nova migration para colunas `relacionamento` |
| `src/pages/AdminConfigFichaPage.tsx` | Reescrever como editor completo |
| `src/hooks/useAdminConfig.ts` | Adicionar mutations para update de campos, update de categorias, reordenacao |
| `src/hooks/useFichaVariacoesLookup.ts` | Adicionar leitura de `relacionamento` |
| `src/pages/OrderPage.tsx` | Usar `relacionamento` para filtrar opcoes (com fallback hardcoded) |
| `src/pages/EditOrderPage.tsx` | Mesma logica de filtro |

### Escopo e limitacoes

- A logica hardcoded dos 5 blocos de modelo (Infantil, City, Tradicional, Bico Fino, Perfilado) sera mantida como **fallback** enquanto os relacionamentos no banco nao estiverem populados
- Conforme o admin preencher os relacionamentos via interface, a logica do banco passa a ter prioridade
- Isso permite migracao gradual sem quebrar nada

