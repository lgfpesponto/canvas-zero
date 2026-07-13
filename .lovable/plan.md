## Objetivo

Permitir que **admin_master** e **admin_producao** editem a "ficha de produção" (bota/cinto) direto no formulário de fazer pedido, com **versionamento**: pedidos novos usam a versão vigente; pedidos antigos continuam vendo/respondendo a versão que estava ativa quando foram criados. E substituir a aba "ficha de produção" em `/admin/configuracoes` por um **histórico de versões** por tipo (bota/cinto).

---

## 1. Botão de edição no formulário de pedido

Escopo: `src/pages/BeltOrderPage.tsx` (cinto), `src/pages/DynamicOrderPage.tsx` (bota) e telas de edição correspondentes (`EditOrderPage`, `EditBeltPage`) — quando o pedido está na versão vigente. Se role é `admin_master` ou `admin_producao`:

- Ícone de **lápis** no topo do card da ficha ("modo edição").
- Ao ligar, cada bloco de variação passa a exibir:
  - Ícone **+** ao lado do campo → abre popover para criar nova variação (nome + preço + relacionamento opcional).
  - Ícone **lápis** em cada opção → edita nome/preço/relacionamento.
  - Ícone **lixeira** em cada opção → remove.
- **Relacionamentos**: mesmo modelo já existente em `ficha_variacoes.relacionamento` (JSONB). Ex.: ao editar "Nobuck" em `couro_cano`, escolher quais valores de `cor_couro_cano` ficam permitidos. Também expõe as combinações Tamanho × Modelo × Sola (usa hoje o mesmo campo).
- Botão fixo no rodapé: **"salvar no banco (nova versão)"**. Confirma → cria uma nova versão da ficha e volta ao modo leitura.

Enquanto em modo edição, o formulário **não** cria pedido; ao sair sem salvar, mudanças são descartadas.

## 2. Versionamento

Nova tabela `ficha_versoes`:

- `ficha_tipo_id`, `versao` (int auto), `snapshot` (JSONB com categorias/campos/variações/relacionamentos), `criado_por`, `descricao_mudanca` (texto opcional), `ativa` (só uma ativa por tipo), `created_at`.

Nova coluna `orders.ficha_versao_id` (nullable → pedidos antigos ficam "sem versão registrada" e continuam usando snapshot que já têm em `extra_detalhes`). Novos pedidos salvam o id da versão ativa no momento da criação.

Fluxo de leitura:
- Formulário de **criar pedido**: sempre usa a versão `ativa` do tipo.
- Formulário de **editar pedido**: se `orders.ficha_versao_id` existe, monta a ficha a partir do `snapshot` daquela versão; senão, usa a versão ativa (compat com pedidos anteriores).
- "Salvar no banco" cria nova linha em `ficha_versoes` com `versao = max+1`, marca como `ativa=true` e as anteriores como `ativa=false`. Também aplica o snapshot em `ficha_categorias`/`ficha_campos`/`ficha_variacoes` para manter compatibilidade com o resto do sistema que hoje lê dessas tabelas (backfill/mirror), garantindo que preços e lookups atuais continuem funcionando.

Pedidos **passados não são afetados**: a leitura respeita `ficha_versao_id` do pedido.

## 3. Substituir aba "ficha de produção" em `/admin/configuracoes`

- Remove os cards e a rota interna `?tab=fichas` do editor antigo (que o usuário disse que não funcionou).
- Cria nova aba **"histórico de fichas"** (`?tab=historico-fichas`) com:
  - Tabs internos por tipo: **bota** / **cinto** (dinâmico se surgirem outros).
  - Lista de versões (mais recente no topo): nº da versão, data, autor, badge "ativa", resumo de mudanças (diff simples: nº de campos/variações adicionados/removidos/alterados).
  - Botão "ver detalhe" → dialog com snapshot completo (read-only).
  - Botão "reverter" (só admin_master) → cria nova versão a partir do snapshot antigo e torna ativa.

O editor `FichaBuilder` e páginas `AdminConfigFichaPage`/`AdminConfigVariacoesPage` deixam de ser linkados a partir dessa aba (não são apagadas do repo neste momento para não quebrar links diretos; podem ficar acessíveis via URL, mas o card some).

---

## Detalhes técnicos

### Migração Supabase
```sql
CREATE TABLE public.ficha_versoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_tipo_id UUID NOT NULL REFERENCES public.ficha_tipos(id) ON DELETE CASCADE,
  versao INT NOT NULL,
  snapshot JSONB NOT NULL,
  descricao_mudanca TEXT,
  criado_por UUID REFERENCES auth.users(id),
  ativa BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ficha_tipo_id, versao)
);
-- GRANT + RLS: leitura para authenticated; escrita só admin_master/admin_producao via has_role.
-- índice parcial garantindo 1 ativa por tipo.
CREATE UNIQUE INDEX ficha_versoes_ativa_uniq
  ON public.ficha_versoes(ficha_tipo_id) WHERE ativa;

ALTER TABLE public.orders ADD COLUMN ficha_versao_id UUID
  REFERENCES public.ficha_versoes(id);
```
Seed inicial: para cada `ficha_tipos` existente, cria `versao=1` com snapshot do estado atual e marca `ativa=true`.

### Snapshot format
```json
{
  "categorias": [{ "id","slug","nome","ordem" }],
  "campos":     [{ "id","categoria_id","slug","nome","tipo","obrigatorio","ordem","vinculo","desc_condicional","relacionamento" }],
  "variacoes":  [{ "id","campo_id","categoria_id","nome","preco_adicional","ordem","relacionamento" }]
}
```

### Componente novo
- `src/components/orders/FichaInlineEditor.tsx` — wrapper que envolve os campos do formulário e, em `editMode`, injeta os botões +/lápis/lixeira e o rodapé "salvar no banco".
- `src/hooks/useFichaVersao.ts` — carrega snapshot ativo OU snapshot do `ficha_versao_id` do pedido em edição.
- `src/hooks/useSalvarFichaVersao.ts` — aplica edições (cria nova `ficha_versoes` + atualiza tabelas espelho).

### Página histórico
- `src/components/gestao/HistoricoFichasTab.tsx` renderizada em `AdminConfigPage` na aba `historico-fichas`.
- Substitui o card antigo "ficha de produção" na listagem.

### Não afeta
- Pedidos existentes (leitura preservada via `ficha_versao_id` ou fallback).
- `custom_options`, extras, preços cache, sync Bagy — nada muda.

### Ordem de execução
1. Migração (tabela `ficha_versoes` + coluna `orders.ficha_versao_id` + seed v1 ativa).
2. Hooks de leitura/gravação de versão.
3. `FichaInlineEditor` + integração no BeltOrderPage/DynamicOrderPage/EditOrderPage/EditBeltPage.
4. Nova aba "histórico de fichas" e remoção do card antigo.
5. Testes manuais: criar pedido novo → edita ficha → salva versão → confirma que pedido velho segue com versão antiga e pedido novo com versão nova.
