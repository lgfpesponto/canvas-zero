# Plano de implementação

## 1. Link da Foto como 1º campo de Identificação (Bota + Cinto)

**Bota — `src/pages/OrderPage.tsx` (linhas 1145-1230)**
- Mover o bloco "Link da Foto de Referência" (atualmente o último item da seção `Identificação`, linhas 1202-1229) para **logo após o `<Section title="Identificação">`**, antes de Vendedor/Nº Pedido/Cliente.
- Manter intacta toda lógica de `fotoUrl`, `setMostrarFotoPainel` e botão "Ver foto".

**Cinto — `src/pages/BeltOrderPage.tsx` (linhas 489-554)**
- Mover o bloco "Link da Foto de Referência" (linhas 526-553) para o topo da seção `Identificação`, antes de Vendedor/Nº Pedido/Cliente/Tamanho.
- Mesma lógica: ao colar URL válido, abre painel lateral "Ver foto".

**Páginas de edição (espelhamento)**
- `src/pages/EditOrderPage.tsx`: garantir que o link da foto também seja o 1º campo dentro de Identificação (atualmente está fora, perto do final, linhas 609-631 — mover para dentro/topo da Section Identificação).
- `src/pages/EditBeltPage.tsx`: mover bloco de foto (linhas 357-368) para topo da Section "Identificação" (linha 214).

## 2. Admin Configurações → Bota: espelhar campos de Recortes com preço editável

**Banco já tem** (verificado via SQL):
- Categoria visual `laser-visual` ("Laser e Recortes") com 6 campos novos: `recorte_cano`, `recorte_gaspea`, `recorte_taloneira`, `cor_recorte_cano`, `cor_recorte_gaspea`, `cor_recorte_taloneira`.
- Categorias-fonte de variação: `recorte_cano`, `recorte_gaspea`, `recorte_taloneira` (cada uma com Anjo, Borda, Touro Brinco, Touro Recortado a R$ 0).

**Falta no admin (`src/pages/AdminConfigFichaPage.tsx`)**:

a) **Render visual da seção "Laser e Recortes"** (linhas 967-986) — atualmente só renderiza laser+glitter por parte e Pintura. Estender para incluir, abaixo de cada par laser/glitter (ou em bloco próprio), o par `recorte_<parte>` + `cor_recorte_<parte>`, na ordem: Cano → Gáspea → Taloneira, mantendo Pintura no fim.

b) **Adicionar entradas em `BOOT_FALLBACK_MAP`** (linhas 1968-1994):
```ts
'recorte_cano':      [{label:'Anjo',preco:0},{label:'Borda',preco:0},{label:'Touro Brinco',preco:0},{label:'Touro Recortado',preco:0}],
'recorte_gaspea':    [...mesmas...],
'recorte_taloneira': [...mesmas...],
```
Isso permite ao admin editar/criar variações com preço usando o mesmo painel `AdminEditableOptions` já existente — cada variação vira linha editável (nome + preço R$) e botão "+ adicionar variação".

c) **Resolução de categoria-fonte**: o `LEGACY_SLUG_MAP` (linhas 889-893) precisa que o slug do campo (`recorte_cano`) bata com slug de categoria (`recorte_cano`) — já bate; nada a alterar.

d) **Cálculo de preço no `OrderPage`** (linha 748): `findPrice(recorteCano, 'recorte_cano', [])` já está correto e vai pegar o preço configurado pelo admin via `priceCache`/`ficha_variacoes`. Apenas preencher os fallbacks vazios `[]` com o array fallback (opcional).

## 3. Ficha impressa: garantir que tudo do "faça seu pedido" apareça

**`src/lib/pdfGenerators.ts`** — auditoria das categorias renderizadas (linhas 333-425):

Já presentes: COUROS, BORDADOS, LASER E RECORTES (com recortes — linhas 360-367 ✅), PESPONTO, SOLADOS, METAIS, ACESSÓRIOS, EXTRAS, DESENVOLVIMENTO, OBS.

**Faltam**:
- **IDENTIFICAÇÃO**: cliente, sob medida (já no header `tam/gen/modelo`, mas falta `Cliente`, `Sob Medida`). Adicionar bloco no header ou nova categoria "IDENTIFICAÇÃO" com Vendedor, Nº Pedido, Cliente, Sob Medida (descrição), Desenvolvimento.
- **ESTAMPA**: hoje aparece dentro de EXTRAS (linha 413). Mover para categoria própria "ESTAMPA" só com `estampaDesc` quando `estampa==='Sim'`.
- **Ordem das categorias**: reorganizar o `categories.push(...)` para a sequência aprovada anteriormente: IDENTIFICAÇÃO → COUROS → PESPONTO → SOLADOS → BORDADOS → LASER E RECORTES → ESTAMPA → METAIS → EXTRAS (Acessórios + Tricê + Tiras + Franja + Corrente + Carimbo + Costura) → ADICIONAL → OBS.
- **ADICIONAL**: hoje vai junto com EXTRAS (linha 416). Separar em categoria "ADICIONAL" com `adicionalDesc + R$ adicionalValor`.

Manter intacta toda a estrutura de 3 colunas, fonte adaptativa, header, canhotos e código de barras.

## 4. Notificação melhorada de modelos transferidos

**`src/pages/OrderPage.tsx` (linhas 623-646)** — toast atual já mostra "X novos modelos de Y". Trocar `toast.info` por `toast.success` persistente e detalhar por remetente quando >1: `"Você recebeu 3 novos modelos: 2 de Maria, 1 de João"`. Aplicar a mesma lógica em `BeltOrderPage.tsx` (criar effect equivalente que faz `select sent_by_name where seen=false and __tipo='cinto'`).

**Marcar como lidas**: `useTemplateManagement.markTemplatesAsSeen(userId)` já existe (linha 117). Chamá-lo automaticamente quando o usuário **abre o diálogo "Modelos"** (`tmpl.setShowTemplates(true)`) tanto em `OrderPage` quanto `BeltOrderPage`. Isso zera o contador no botão e o badge "Novo" deixa de aparecer nas próximas aberturas, **mas** mantém-se na sessão atual (estado local não é re-fetchado até reload), satisfazendo "manter o número que aparece na primeira vez e depois apaga".

## 5. Lista de modelos: priorizar o nome, esconder "Recebido de…"

**`src/pages/OrderPage.tsx` (linhas 1507-1518) e `src/pages/BeltOrderPage.tsx` (linhas 750-758)**:
- Remover o bloco `{t.sent_by_name && (<span>... Recebido de {t.sent_by_name}</span>)}`.
- Garantir que o `<span className="font-semibold text-sm truncate">{t.nome}</span>` não trunque — trocar `truncate` por `break-words` (ou remover `truncate` e dar `min-w-0 flex-1` ao container) para o nome aparecer inteiro mesmo em modelos transferidos.
- O badge "Novo" (linha 1512 / 752) permanece para sinalizar quais modelos chegaram nesta sessão.

## Arquivos editados
- `src/pages/OrderPage.tsx` — reordem identificação, link foto no topo, lista de modelos limpa, toast melhorado, marcar como lidas no abrir
- `src/pages/BeltOrderPage.tsx` — idem para cinto + novo effect de toast de transferidos
- `src/pages/EditOrderPage.tsx` — link foto no topo da identificação
- `src/pages/EditBeltPage.tsx` — link foto no topo da identificação
- `src/pages/AdminConfigFichaPage.tsx` — render dos recortes na seção Laser e Recortes + 3 entradas em `BOOT_FALLBACK_MAP`
- `src/lib/pdfGenerators.ts` — adicionar IDENTIFICAÇÃO, separar ESTAMPA e ADICIONAL, reordenar categorias

## Sem alterações de banco
Os 3 categorias-fonte e os 6 campos visuais já existem (verificado via consulta SQL). O admin poderá editar preços das 4 variações iniciais (Anjo, Borda, Touro Brinco, Touro Recortado) e criar novas direto pelo painel `AdminEditableOptions` assim que a categoria visual aparecer no editor.