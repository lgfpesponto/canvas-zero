
# Plano — 5 mudanças coordenadas

Cada item é independente e preserva 100% das somatórias e dados existentes.

---

## 1) Selecionar VÁRIOS modelos para enviar de uma vez (Bota)

**Arquivos:** `src/pages/OrderPage.tsx`, `src/hooks/useTemplateManagement.ts`

Hoje o botão "Enviar" (`Send`) abre o diálogo passando **um único** `template`. Vou:

- Substituir `sendingTemplate: TemplateRecord | null` por `sendingTemplates: TemplateRecord[]`.
- No diálogo "Modelos Salvos", adicionar um **checkbox por linha** + botão "Enviar selecionados (N)" no rodapé. Manter o ícone `Send` em cada linha como atalho para enviar **só aquele**.
- No diálogo "Enviar modelo": mostrar a lista dos modelos selecionados ("Enviando 3 modelos: Texana A, Texana B, ...") e os destinatários como já é hoje.
- Em `useTemplateManagement.sendTemplateToUsers`, aceitar **array de templates** e fazer `insert` em massa: `templates × destinatários` (já é `insert(rows)`, só ampliar o `flatMap`).
- Toast final: "X modelo(s) enviado(s) para Y usuário(s)".

> Não muda nada na ficha; é só o fluxo de envio.

---

## 2) Trocar "MONTAGEM" por "Nº pedido: ..." no canhoto da ficha impressa

**Arquivo:** `src/lib/pdfGenerators.ts` (linhas 547-553, lado direito do stub)

Hoje:
```
MONTAGEM
TAM SOLADO COR... | forma: X
BICO vira COR
```

Novo (mesmo lugar, mesma fonte/altura):
```
Nº pedido: 7E-20250123
TAM SOLADO COR... | forma: X
BICO vira COR
```

- Remover a linha `doc.text('MONTAGEM', ...)`.
- Trocar por `doc.text('Nº pedido: ' + orderNumClean, rightCx, stubTop + 5, { align: 'center' })`.
- O lado **esquerdo** do stub (código de barras + número grande embaixo) **continua igual** — o número também aparece lá embaixo do código de barras, conforme já é hoje.

---

## 3) Sistema de modelos para a ficha de Cinto

**Arquivos:** `src/pages/BeltOrderPage.tsx` (principal), reaproveita `src/hooks/useTemplateManagement.ts` e `order_templates` (já no banco).

Hoje a página de Cinto **não tem** sistema de modelos. Vou replicar o padrão da Bota, mas com os campos do Cinto:

- Estado `mode: 'order' | 'template'` + uso do `useTemplateManagement()`.
- Dois botões no header ao lado do título "Ficha de Produção — Cinto":
  - **"Criar Modelo"** → entra em modo template (esconde validações de envio, exige nome do modelo).
  - **"Modelos"** com badge de não-vistos → abre diálogo de modelos salvos com pesquisa, **Editar / Preencher / Enviar / Apagar** (mesmas ações da bota).
- `buildFormData()` para Cinto serializa: `tamanho, tipoCouro, corCouro, fivela, fivelaOutroDesc, bordadoP, bordadoPDesc, bordadoPCor, nomeBordado, nomeBordadoDesc, nomeBordadoCor, nomeBordadoFonte, carimbo, carimboDesc, carimboOnde, adicionalDesc, adicionalValor, observacao`.
- `populateFormFromTemplate(fd)` para preencher de volta.
- Reaproveita o **mesmo diálogo "Enviar modelo"** (com a melhoria do item 1, também no cinto: poder selecionar vários modelos do cinto e enviar em lote).

> Isolamento: usei o mesmo `order_templates` (campo `form_data jsonb` já é flexível). Para distinguir Bota vs Cinto, vou gravar uma chave `__tipo: 'cinto'` no `form_data`. Na hora de carregar na **OrderPage (bota)**, filtro `__tipo !== 'cinto'`; na **BeltOrderPage**, filtro `__tipo === 'cinto'`. Migração de dados existente: templates antigos (sem `__tipo`) ficam visíveis na Bota (comportamento atual preservado).

---

## 4) Espelhar o NOVO layout de "Faça seu Pedido" também nas telas de EDIÇÃO

**Arquivos:** `src/pages/EditOrderPage.tsx` (Bota) e `src/pages/EditBeltPage.tsx` (Cinto)

Hoje as telas de edição usam um `Section` antigo (linha cinza embaixo do título) e ordem antiga de campos. Vou:

### EditOrderPage (Bota)
- Trocar o componente `Section` para o **mesmo estilo terracota** uppercase usado em `OrderPage`:
  ```tsx
  <h3 className="bg-primary text-primary-foreground text-center font-display font-bold text-lg uppercase tracking-wide py-2 rounded-sm">
  ```
- Reordenar exatamente como na ficha nova:
  **IDENTIFICAÇÃO → COUROS → PESPONTO → SOLADO → BORDADO → LASER E RECORTES → ESTAMPA → METAIS → EXTRAS → ADICIONAL → OBSERVAÇÃO**
- Mover Vendedor, Nº Pedido, Cliente, Tamanho/Gênero/Modelo, Sob Medida, **Desenvolvimento** e **Link da Foto** (com botão "Ver foto" e painel `FotoPedidoSidePanel`) para dentro de IDENTIFICAÇÃO.
- Mover Acessórios e Carimbo a Fogo para EXTRAS.
- Envolver Estampa em própria seção.
- Observação em Section própria.
- **NENHUMA mudança em estados, handlers, total, payload do `updateOrder` ou nomes de campos** — só JSX/ordem.

### EditBeltPage (Cinto)
- Mesmo `Section` terracota.
- Adicionar Section **IDENTIFICAÇÃO** englobando: Vendedor, Nº Pedido, Cliente, Tamanho, **Link da Foto + botão Ver foto** (hoje o link só aparece pelo `?foto=1` da URL — vou expor o input + toggle do painel direto na ficha como na BeltOrderPage).
- Manter Couro, Fivela, Bordado P, Nome Bordado, Carimbo, Adicional, Observação como Sections.

> Cálculos, validações e `updateOrder` permanecem **idênticos**.

---

## 5) Renomear "Laser" → "LASER E RECORTES" e adicionar 3 campos novos (com cor condicional)

**Mudanças** em: ficha de pedido (UI) + ficha de produção/admin (configuração) + banco (semente das categorias).

### a) Renomear seção
- Em `OrderPage.tsx` e `EditOrderPage.tsx`: `<Section title="Laser e Recortes">`.
- Em `AdminConfigFichaPage.tsx`: o slug visual continua `laser-visual` (não mudar o slug — só o **nome** da categoria via `updateCategoria`). Migration única para renomear a row em `ficha_categorias` onde `slug='laser-visual'` para `nome='Laser e Recortes'`.

### b) Novos campos — acima da Pintura, dentro da seção Laser e Recortes
Para cada parte (cano, gáspea, taloneira), **abaixo** dos campos atuais de laser/glitter, adicionar:

| Slug do campo | Label | Tipo | Vínculo |
|---|---|---|---|
| `recorte_cano` | "Recortes do Cano" | seleção única | `recorte_cano` (categoria de variações) |
| `recorte_gaspea` | "Recortes da Gáspea" | seleção única | `recorte_gaspea` |
| `recorte_taloneira` | "Recortes da Taloneira" | seleção única | `recorte_taloneira` |

E logo abaixo de cada, um campo **texto livre condicional**:
- `cor_recorte_cano` ("Cor do Recorte do Cano") — só aparece se `recorte_cano` foi selecionado.
- `cor_recorte_gaspea` / `cor_recorte_taloneira` — idem.

**Variações iniciais** (carregadas via migration/insert nas 3 categorias `recorte_cano`, `recorte_gaspea`, `recorte_taloneira`):
- Anjo
- Borda
- Touro Brinco
- Touro Recortado

Preço default = R$ 0 — admin define o valor de cada um na tela "Configurações → Ficha de Produção Bota" exatamente como já faz para os outros campos (a tabela `ficha_variacoes` já tem `preco_adicional` e o editor `BootFieldRenderer` já lida com isso). **Não há preço hardcoded** — usa a mesma cascata `findFichaPrice → custom_options → fallback (0)`.

### c) Migration (apenas DDL/seed mínimo)
SQL único:
```sql
-- Renomeia categoria
UPDATE ficha_categorias
SET nome = 'Laser e Recortes'
WHERE slug = 'laser-visual';

-- Cria 3 categorias-fonte de variações de recorte (não visuais, só para preços)
-- Fica em ficha_categorias com ordem alta + ativo=true (mesmo padrão de bordado_cano etc.)
INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem, ativo)
SELECT ft.id, slug, nome, 999, true
FROM ficha_tipos ft, (VALUES
  ('recorte_cano', 'Recortes do Cano'),
  ('recorte_gaspea', 'Recortes da Gáspea'),
  ('recorte_taloneira', 'Recortes da Taloneira')
) AS x(slug, nome)
WHERE ft.slug = 'bota' AND NOT EXISTS (
  SELECT 1 FROM ficha_categorias WHERE ficha_tipo_id = ft.id AND slug = x.slug
);

-- Cria os 3 campos (visíveis na seção laser-visual) — selecao
INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, slug, nome, tipo, ordem, ativo, obrigatorio)
SELECT ft.id, lv.id, slug, nome, 'selecao', ordem, true, false
FROM ficha_tipos ft
JOIN ficha_categorias lv ON lv.ficha_tipo_id = ft.id AND lv.slug = 'laser-visual',
(VALUES
  ('recorte_cano', 'Recortes do Cano', 50),
  ('recorte_gaspea', 'Recortes da Gáspea', 51),
  ('recorte_taloneira', 'Recortes da Taloneira', 52)
) AS x(slug, nome, ordem)
WHERE ft.slug = 'bota' AND NOT EXISTS (
  SELECT 1 FROM ficha_campos WHERE ficha_tipo_id = ft.id AND slug = x.slug
);

-- Cria os 3 campos de cor condicional (texto)
INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, slug, nome, tipo, ordem, ativo, obrigatorio, desc_condicional)
SELECT ft.id, lv.id, slug, nome, 'texto', ordem, true, false, true
FROM ficha_tipos ft
JOIN ficha_categorias lv ON lv.ficha_tipo_id = ft.id AND lv.slug = 'laser-visual',
(VALUES
  ('cor_recorte_cano', 'Cor do Recorte do Cano', 53),
  ('cor_recorte_gaspea', 'Cor do Recorte da Gáspea', 54),
  ('cor_recorte_taloneira', 'Cor do Recorte da Taloneira', 55)
) AS x(slug, nome, ordem)
WHERE ft.slug = 'bota' AND NOT EXISTS (
  SELECT 1 FROM ficha_campos WHERE ficha_tipo_id = ft.id AND slug = x.slug
);

-- Variações iniciais (preço 0 — admin ajusta depois)
INSERT INTO ficha_variacoes (categoria_id, nome, preco_adicional, ordem, ativo)
SELECT fc.id, v.nome, 0, v.ord, true
FROM ficha_categorias fc
JOIN ficha_tipos ft ON ft.id = fc.ficha_tipo_id AND ft.slug = 'bota',
(VALUES
  ('Anjo', 1), ('Borda', 2), ('Touro Brinco', 3), ('Touro Recortado', 4)
) AS v(nome, ord)
WHERE fc.slug IN ('recorte_cano', 'recorte_gaspea', 'recorte_taloneira')
AND NOT EXISTS (
  SELECT 1 FROM ficha_variacoes WHERE categoria_id = fc.id AND nome = v.nome
);
```

### d) Persistência no pedido
Adicionar 6 colunas em `orders`:
```sql
ALTER TABLE orders
  ADD COLUMN recorte_cano text,
  ADD COLUMN recorte_gaspea text,
  ADD COLUMN recorte_taloneira text,
  ADD COLUMN cor_recorte_cano text,
  ADD COLUMN cor_recorte_gaspea text,
  ADD COLUMN cor_recorte_taloneira text;
```

### e) Renderização do bloco Laser na ficha (OrderPage + EditOrderPage)
Para cada parte, adicionar **acima do campo Pintura**, dentro do bloco existente:
```tsx
<SelectField label="Recortes do Cano" value={recorteCano} onChange={setRecorteCano}
             options={getDbItems('recorte_cano', RECORTES_FALLBACK)} />
{recorteCano && (
  <input type="text" value={corRecorteCano} onChange={...}
         placeholder="Cor do recorte..." />
)}
```
(Análogo para Gáspea e Taloneira.)

### f) Cálculo de preço
Adicionar ao `total` da bota (mesma lógica de bordado/laser, via `findPrice`):
```ts
const recortePreco =
  findPrice(recorteCano, 'recorte_cano', []) +
  findPrice(recorteGaspea, 'recorte_gaspea', []) +
  findPrice(recorteTaloneira, 'recorte_taloneira', []);
```
**Adicionar** ao `total` final. As outras somas continuam intactas.

### g) Ficha impressa, espelho e detalhes
- Espelho (`mirrorRows`): adicionar 6 entradas (3 recortes + 3 cores) só quando preenchidas.
- `OrderDetailPage` (grupo "Laser e Recortes"): incluir as 6 chaves na lista de exibição.
- `pdfGenerators.ts`: adicionar as 6 chaves no array `LASER_FIELDS` (ou equivalente) que monta o bloco Laser do PDF.

### h) Admin — editor da ficha
Como já uso o renderizador genérico `BootFormLayout`/`BootFieldRenderer` baseado em DB, **os 3 novos campos aparecem automaticamente** no editor com botões de adicionar/editar/remover variações e definir preço. Não precisa código novo no admin além do agrupamento "laser-visual" já existente — só vou estender o helper `if (cat.slug === 'laser-visual')` para também listar `recorte_${part}` + `cor_recorte_${part}` na ordem (Laser → Glitter → Recorte → Cor Recorte) por parte, e Pintura por último.

---

## Ordem de implementação sugerida
1. Migration SQL (item 5c + 5d) — base para tudo.
2. Item 5 (UI/preço/PDF) — maior, mais arriscado.
3. Item 4 (espelhar layout nas edições) — depende do item 5 (precisa do `recortes` no Edit também).
4. Item 3 (modelos no cinto).
5. Item 2 (texto do PDF).
6. Item 1 (envio múltiplo) — fica por último, melhoria UX isolada.

---

## Garantias finais
- **Somatórias intactas**: nenhum cálculo existente é alterado; novos preços (recortes) usam a mesma cascata de fallback (R$ 0 por padrão).
- **Pedidos antigos**: as 6 novas colunas são `nullable`; pedidos sem recortes simplesmente não exibem nada nos 6 campos.
- **Modelos antigos**: continuam funcionando — sem `__tipo` aparecem na bota (como hoje).
- **Sem renomear slugs existentes** — só nomes visuais.
