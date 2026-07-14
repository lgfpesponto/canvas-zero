## 1. Bug — Composição mostra Solado R$60 mesmo com ficha nova R$65

**Diagnóstico:** `recomputeSubtotal` já usa `findFichaPrice(order.solado, 'solado')` e retorna R$65. Mas a **linha de composição no detalhe** e outros locais leem direto da constante hardcoded `SOLADO` (R$60):

- `src/pages/OrderDetailPage.tsx:373` (Modelo), `:441` (Solado), `:445` (Cor Vira), `:443` (Cor Sola)
- `src/pages/EditOrderPage.tsx:423, :477, :480`
- `src/lib/cobrancaPdf.ts:211, :259, :264`
- `src/components/SpecializedReports.tsx:324, :372, :376`
- `src/lib/recomputeOrderPrice.ts:52` (Modelo — falta findFichaPrice)

**Regra-chave (respeitar histórico):** cada pedido tem `fichaVersaoId` (versão ativa no momento da criação). O preço exibido/recomputado precisa vir do **snapshot dessa versão**, não da versão ativa atual. Pedidos antigos continuam com os preços da época; só pedidos criados depois da nova versão pegam os preços novos.

**Implementação:**

**Novo hook `useFichaPriceForOrder(order)`** (`src/hooks/useFichaPriceForOrder.ts`):
- Se `order.fichaVersaoId` existe: carrega `ficha_versoes.snapshot` (cache por id via react-query) e monta índice `{categoria_slug + nome → preco_adicional}` a partir de `snapshot.variacoes` + `snapshot.campos` (para resolver `campo_id → slug`).
- Se `fichaVersaoId` é null (pedidos antigos sem versão) OU snapshot não tem o item: **fallback para `findFichaPrice` atual** (`useFichaVariacoesLookup`), e depois hardcoded.
- Retorna `findFichaPrice(nome, categoria) → number | undefined` com a mesma assinatura já usada em `recomputeSubtotal`.

**Substituições:** trocar todas as ocorrências acima por `findFichaPrice(nome, categoria) ?? <hardcoded>?.preco`, usando o hook novo em contextos com `order` (detail/edit) e mantendo o `findFichaPrice` atual em contextos batch (relatórios/PDFs em lista). Para relatórios em lote (`SpecializedReports`, `cobrancaPdf`), o resolver recebe `order` e escolhe internamente snapshot vs current — pré-carregando snapshots dos ids únicos presentes no lote (uma query `in ('id1','id2',...)`).

Para Modelo: adicionar `'modelo'` (ou `tamanho_genero_modelo`, a confirmar) ao `CATEGORY_MAP` do `useFichaVariacoesLookup` e ao índice do snapshot.

**Efeito:** pedidos existentes preservam preços da versão da ficha em que foram criados; pedidos novos passam a exibir os preços da nova versão. Total e composição ficam coerentes em todos os lugares.

---

## 2. Prazo de Produção editável em Modo Edição (bota + cinto)

**OrderPage.tsx (bota) e BeltOrderPage.tsx (cinto):**
- Substituir "20 dias úteis" hardcoded por leitura de `ficha_tipos.lead_time_dias` (slug `bota`/`cinto`). Incluir o bloco também no BeltOrderPage.
- Quando `FichaEditContext` ativo E `role === admin_master`, transformar em `<input type="number">`. Alteração local; ao clicar **"salvar versão"**, faz `UPDATE ficha_tipos SET lead_time_dias = N` antes de gerar o snapshot da nova versão.
- Enquanto não salva a versão, badge "editado — salve a versão para aplicar".

**fichaVersoes.ts:** incluir `ficha_tipo` (com `lead_time_dias`) no `FichaSnapshot`. `salvarNovaVersao(fichaTipoId, descricao, overrideLeadTime?)` aplica o override antes do snapshot.

Pedidos novos continuam gravando `orders.lead_time_snapshot` (já implementado). Pedidos antigos não são tocados.

---

## 3. Prefixo de vendedor + numeração automática

**Migração (schema):**
- `ALTER TABLE public.profiles ADD COLUMN pedido_prefixo text;`
- RPC `public.next_order_numero(_prefixo text) RETURNS text` (security definer, grant a `authenticated`):
  `SELECT COALESCE(MAX((regexp_replace(numero,'^'||_prefixo,''))::int),0)+1 FROM orders WHERE numero ~ ('^'||_prefixo||'\d+$')` → retorna `_prefixo || N`.

**Data (insert tool):** `UPDATE profiles SET pedido_prefixo='RC' WHERE login='rancho_chique'` (confirmar login no exec).

**UsersManagementPage.tsx:** novo input "Prefixo de pedido" visível quando `role ∈ {vendedor, vendedor_comissao}`. Persiste em `profiles.pedido_prefixo`.

**Auto-preenchimento do número:**
- Vendedor com `pedido_prefixo` E não é `estoque` / `juliana` / `rancho_chique` (site): campo `numero` **readonly**, preenchido via `next_order_numero(prefixo)` ao abrir formulário.
- Rancho Chique (prefixo `RC` mas número vem da Bagy): campo continua editável.
- Estoque / Juliana / vendedores sem prefixo: comportamento atual.
- Admin (`admin_master`/`admin_producao`) criando pedido: após selecionar vendedor, se ele se enquadra, número é auto-preenchido e readonly; se trocar vendedor, recalcula.

Locais: `OrderPage.tsx`, `BeltOrderPage.tsx`, `ExtrasPage.tsx`. Edição (`EditOrderPage`, `EditBeltPage`, `EditExtrasPage`) não recalcula.

Concorrência: `useCheckDuplicateOrder` já valida colisão; volume baixo, sem lock adicional.

---

## Ordem de execução

1. Bug do preço com resolução por versão da ficha (item 1).
2. Migração `profiles.pedido_prefixo` + RPC `next_order_numero`.
3. UI de prefixo em UsersManagementPage + auto-preenchimento nas 3 páginas de criação.
4. Prazo editável + snapshot na versão da ficha.
