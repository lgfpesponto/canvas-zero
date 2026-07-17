## Plano

1. Corrigir estado "obrigatório" no editor da ficha
- No popover de `Editar ficha`, ler o valor atual de `obrigatorio` do campo no banco toda vez que abrir e a cada atualização, para que o switch reflita o real estado.
- Garantir que ao alternar e salvar o valor persista e o próximo abrir mostre corretamente marcado/desmarcado.

2. Corrigir criação de novas variações
- Fazer o botão `+` e o formulário do popover realmente gravarem em `ficha_variacoes` (não só atualizar preço).
- Invalidar os caches usados pelo formulário para as novas variações aparecerem imediatamente.
- Mostrar feedback claro (quantidade salva).

3. Corrigir relacionamentos (foco em Solado → Cor da Sola / Cor da Vira)
- Ler no banco os relacionamentos já cadastrados em `ficha_variacoes.relacionamento` para o tipo ficha `bota`.
- Ajustar o hook de relacionamento para:
  - Fazer o match tolerante a acentos, espaços e maiúsculas.
  - Aceitar múltiplas variações com o mesmo nome quando o preço depende de outro campo (ex.: `Marrom` em `Cor da Sola` com relacionamento `solado: [Borracha]` versus a `Marrom` sem preço que se aplica a PVC).
- No formulário de pedido, usar os relacionamentos para filtrar as opções mostradas em `Cor da Sola` e `Cor da Vira` com base no `Solado` selecionado, mantendo as regras existentes como fallback.

4. Corrigir preço contextual de `Cor da Sola`
- Para `PVC + Marrom`, aplicar o preço da variação contextual (R$ 0), não a `Marrom` genérica que custa R$ 20.
- Manter o helper `getCorSolaPrecoContextual` como fallback quando não houver dado no banco.
- Aplicar o mesmo padrão para `Cor da Vira` quando houver conflito de nomes.

5. Preservar regras existentes
- Não apagar variações existentes nem alterar pedidos antigos.
- Não mexer em RLS, permissões, estrutura do banco ou preços já documentados em `docs/BUSINESS_RULES.md`.

## Arquivos previstos
- `src/components/ficha-edit/FichaFieldControls.tsx` — estado do switch `obrigatorio` sincronizado com o campo; gravação de drafts + feedback.
- `src/hooks/useAdminConfig.ts` — invalidar caches usados no formulário ao inserir variação.
- `src/hooks/useDynamicFieldFilter.ts` — match tolerante e retornar preço contextual.
- `src/hooks/useFichaVariacoesLookup.ts` — helper `findFichaPriceContextual` que respeita `relacionamento`.
- `src/pages/OrderPage.tsx` — usar filtro dinâmico para Cor da Sola / Cor da Vira e preço contextual no cálculo do total.

## Validação
- Antes de codar: comparar as opções que aparecem hoje em `Cor da Sola` para `PVC`, `Borracha` e `Couro Reta` com os relacionamentos cadastrados no banco e listar qualquer divergência para ajustar via UI de admin ou correção pontual.
- Depois: abrir `Editar ficha` de um campo obrigatório e conferir que o switch está marcado; alternar, salvar e reabrir para confirmar persistência.
- Criar uma nova variação em `Cor da Sola` e confirmar que aparece no formulário sem recarregar.
- No formulário de pedido:
  - `PVC` → só mostra `Preto`, `Off White`, `Marrom` (ou o que estiver no relacionamento) com R$ 0.
  - `Borracha + Marrom` → segue cobrando R$ 20.
  - `Couro Reta + Madeira` → segue R$ 0.