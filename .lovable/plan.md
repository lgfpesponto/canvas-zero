## Fluxo "Comprar" em `/modelos` sem sair da página + filtro de modelos completos

### 1. Espelho por cima do modal, sem navegar

Hoje `handleConferir` em `ModelosPage.tsx` faz `navigate('/pedido' | '/pedido-cinto', ...)`, o que recarrega a página e leva o usuário para fora. Vamos manter tudo dentro de `/modelos`.

**Passos:**

1. Extrair de `OrderPage.tsx` e `BeltOrderPage.tsx` duas funções puras num novo arquivo `src/lib/comprarRapido.ts`:
   - `buildOrderPreview(template, overrides, ctx)` → devolve o objeto no mesmo formato usado pelo espelho atual (composição, identificação, couros, bordados, preço), reaproveitando os helpers já existentes (`priceCache`, `recomputeOrderPrice`, `botaExtraHelpers`, etc.).
   - `createBotaOrder({ template, overrides, gradeItems, user, allProfiles })` e `createCintoOrder(...)` encapsulando exatamente o submit atual dos dois pages (merge form_data + overrides, `addOrder` / `addOrderBatch`, notificações, atribuição). Zero mudança de regra.
2. Criar `src/components/orders/EspelhoFichaDialog.tsx` que renderiza o mesmo markup do espelho hoje inline em OrderPage/BeltOrderPage, recebendo `preview`, `onEditar`, `onConfirmar`, `loading`.
3. Em `ModelosPage.tsx`:
   - Novo state `espelhoOpen`, `espelhoPreview`, `salvando`.
   - `handleConferir` deixa de navegar: monta overrides → chama `buildOrderPreview` → abre `EspelhoFichaDialog` por cima do modal atual (o modal de identificação permanece montado com os dados).
   - Botões do espelho:
     - **Editar** → fecha só o espelho, foco volta ao modal de identificação.
     - **OK, finalizar** → chama `createBotaOrder`/`createCintoOrder` conforme `comprarModelo.tipo`, mostra toast "Pedido criado", fecha os dois dialogs, limpa states, permanece em `/modelos`.
4. Remover de `OrderPage.tsx` e `BeltOrderPage.tsx` toda a lógica `comprarMode` (state, `hidden` do form, abertura automática do espelho, interceptação de EDITAR para voltar a `/modelos`). Essas páginas voltam a servir só o fluxo direto normal.
5. Remover o `location.state.editComprar` de ida/volta — não é mais necessário porque nunca saímos de `/modelos`.

### 2. Filtro: só entram modelos "completos"

Modelos rascunho ganharam recentemente **gênero** e **URL da foto**. Modelos antigos sem esses dois campos preenchidos não devem aparecer em `/modelos` (que é a vitrine de compra rápida) — continuam existindo no banco e no fluxo original.

- Campo da foto: coluna `foto_url` já existe em `order_templates` (usada no card).
- Campo do gênero: hoje vem dentro de `form_data.genero` (mesma chave usada em OrderPage). Verificar na leitura.

**Alteração em `ModelosPage.tsx`:**

- No `useEffect` que carrega `modelos`, aplicar filtro:
  ```ts
  const isCompleto = (r) =>
    !!(r.foto_url && String(r.foto_url).trim()) &&
    !!((r.form_data?.genero ?? '').toString().trim());
  ```
- Guardar apenas os completos em `setModelos`. Os incompletos ficam invisíveis nessa página.
- Manter contador `X modelo(s)` refletindo só os completos. Sem toast/aviso — comportamento silencioso, como o usuário pediu.

### 3. Detalhes técnicos

- `EspelhoFichaDialog` usa `Dialog` do shadcn com `z-index` padrão; empilha naturalmente sobre o modal de identificação (ambos são portals).
- `createBotaOrder`/`createCintoOrder` recebem `user` e `allProfiles` para preservar a lógica de atribuição/comissão atual.
- `gradeItems` continuam sendo aplicados via `addOrderBatch` (mesmo caminho de hoje).
- Nada muda em preço, comissão, PDF, notificações, RLS, criação/edição de modelos.

### 4. Fora de escopo

- Não altera o fluxo direto de `/pedido` e `/pedido-cinto`.
- Não altera criação/edição de modelos rascunho.
- Não migra dados: modelos antigos incompletos continuam no banco; só ficam ocultos da vitrine.
