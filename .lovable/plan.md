# Continuação — finalizar os 3 itens restantes

Já está pronto:
- ✅ Migration (recortes + categorias + colunas)
- ✅ OrderPage com seção "LASER E RECORTES" + recortes condicionais
- ✅ Total da bota inclui preços de recorte (via `findFichaPrice`)
- ✅ PDF: stub agora mostra "Nº pedido: …" no lugar de "MONTAGEM"
- ✅ Envio múltiplo de modelos (checkboxes na lista + botão "Enviar selecionados")

Falta entregar:

---

## 1) Detalhe (`OrderDetailPage.tsx`) — exibir recortes
- Renomear o grupo `'Laser'` para **`'Laser e Recortes'`**.
- Inserir 6 novas linhas no array `itens` desse grupo, entre laser e pintura, na ordem **Cano → Gáspea → Taloneira**:
  - `Recorte Cano` / `Cor Recorte Cano`
  - `Recorte Gáspea` / `Cor Recorte Gáspea`
  - `Recorte Taloneira` / `Cor Recorte Taloneira`
- O helper `filterPairs` já oculta linhas vazias — pedidos antigos (sem recorte) não exibem nada novo.

## 2) PDF da ficha de produção (`pdfGenerators.ts`)
- Renomear o título do bloco `LASER` → **`LASER E RECORTES`** no PDF da bota (`generateProductionSheetPDF`).
- Adicionar 3 linhas no array `laserFields` (uma por parte) **somente quando o recorte estiver preenchido**:
  ```ts
  if (order.recorteCano) laserFields.push({ label: 'Recorte cano:', value: `${order.recorteCano.toLowerCase()}${order.corRecorteCano ? ' ' + order.corRecorteCano.toLowerCase() : ''}` });
  if (order.recorteGaspea) laserFields.push({ label: 'Recorte gáspea:', value: `${order.recorteGaspea.toLowerCase()}${order.corRecorteGaspea ? ' ' + order.corRecorteGaspea.toLowerCase() : ''}` });
  if (order.recorteTaloneira) laserFields.push({ label: 'Recorte taloneira:', value: `${order.recorteTaloneira.toLowerCase()}${order.corRecorteTaloneira ? ' ' + order.corRecorteTaloneira.toLowerCase() : ''}` });
  ```

## 3) Sistema de modelos no Cinto (`BeltOrderPage.tsx`)
Replicar o padrão da bota, isolando por flag `__tipo: 'cinto'` no `form_data`.

**Estado / hook:**
- Importar `useTemplateManagement` e instanciar `const tmpl = useTemplateManagement()`.
- Adicionar `mode: 'order' | 'template'`.
- Carregar templates no mount (`tmpl.loadTemplates(user.id)`) **filtrando** apenas os com `form_data.__tipo === 'cinto'` (na função render que monta a lista visível, pode-se aplicar `tmpl.templates.filter(t => (t.form_data as any).__tipo === 'cinto')`).
- Quando salvar template (cinto), incluir `__tipo: 'cinto'` no `buildFormData()`.
- Em `OrderPage` (bota), o filtro existente continua valendo: bota mostra apenas templates **sem** `__tipo` ou com `__tipo === 'bota'`. → atualizar a lista visível em OrderPage também filtrando: `tmpl.templates.filter(t => (t.form_data as any).__tipo !== 'cinto')`.

**Funções:**
- `buildBeltFormData()` serializando: `tamanho, tipoCouro, corCouro, fivela, fivelaOutroDesc, bordadoP/Desc/Cor, nomeBordado/Desc/Cor/Fonte, carimbo/Desc/Onde, adicionalValor, adicionalDesc, observacao, __tipo: 'cinto'`.
- `populateBeltFormFromTemplate(fd)` repondo todos os estados.
- `handleSaveTemplate()` / `handleUpdateTemplate()` / `handleDeleteTemplate()` / `handleEditTemplate()` / `handleUseTemplate()` análogos.
- `openSendDialog(templates[])` + diálogo de envio, igual ao da bota (com checkbox de seleção múltipla na lista de modelos para envio em lote).

**UI:**
- Botões "Criar Modelo" e "Modelos (badge unseen)" no header ao lado de "Ficha de Produção — Cinto".
- Diálogo "Modelos Salvos" com pesquisa, **Editar / Preencher / Enviar / Apagar** por linha + checkbox de seleção em lote + botão "Enviar selecionados".
- Diálogo "Enviar modelo(s)" reutilizando o componente padrão (lista de usuários + checkbox).
- Botão de submit muda para "CRIAR MODELO" / "SALVAR ALTERAÇÕES NO MODELO" quando `mode === 'template'`.
- Em modo template, ocultar campos de envio (foto, validações de cliente, número, etc.) e exigir só o nome do modelo.

**Dica:** o hook `useTemplateManagement` já é genérico (form_data é jsonb), então tudo funciona sem alteração.

## 4) Layout novo nas páginas de Edição

### a) `EditOrderPage.tsx` (Bota)
- Trocar o componente `Section` para o **mesmo estilo da OrderPage**:
  ```tsx
  <h3 className="bg-primary text-primary-foreground text-center font-display font-bold text-lg uppercase tracking-wide py-2 rounded-sm">
  ```
- Reordenar exatamente como na ficha nova:
  **IDENTIFICAÇÃO → COUROS → PESPONTO → SOLADO → BORDADO → LASER E RECORTES → ESTAMPA → METAIS → EXTRAS → ADICIONAL → OBSERVAÇÃO**
- IDENTIFICAÇÃO englobando: Vendedor, Nº Pedido, Tamanho/Gênero/Modelo, Sob Medida, Desenvolvimento, Link da Foto + botão "Ver foto" (com painel `FotoPedidoSidePanel` aberto via state `mostrarFotoPainel` — espelhar OrderPage).
- EXTRAS englobando: Acessórios, Tricê, Tiras, **Carimbo a Fogo** (mover para cá).
- ESTAMPA própria seção.
- LASER E RECORTES: adicionar os 3 selects de recorte + 3 campos de cor condicionais (mesmo JSX da OrderPage).
- Adicionar 6 novos states: `recorteCano, corRecorteCano, recorteGaspea, corRecorteGaspea, recorteTaloneira, corRecorteTaloneira`. Inicializar a partir de `order.recorteCano` etc. (já estão no tipo Order). Incluir no `updateOrder` payload e somar ao `total` via `findFichaPrice`.

### b) `EditBeltPage.tsx` (Cinto)
- Mesmo `Section` terracota.
- Adicionar `Section` **IDENTIFICAÇÃO** com Vendedor, Nº Pedido, Cliente, Tamanho, Link da Foto + botão "Ver foto" + painel `FotoPedidoSidePanel` (substituindo o atual painel via `?foto=1`).
- Manter Couro, Fivela, Bordado P, Nome Bordado, Carimbo, Adicional, Observação como `Section`s estilizadas.

> Nenhuma mudança em estados, handlers, total, ou payload do `updateOrder` — só JSX/ordem (exceto a adição dos recortes em EditOrderPage).

---

## Ordem de implementação
1. Detalhe + PDF (mais isolado)
2. EditOrderPage (mais código, mas já temos referência da OrderPage)
3. EditBeltPage
4. Templates do Cinto (novo, mas reaproveita 100% do hook)

## Garantias
- Pedidos antigos sem recorte: nada novo aparece (filterPairs/condicionais).
- Modelos antigos sem `__tipo`: continuam aparecendo na bota; cinto só vê os com `__tipo === 'cinto'`.
- Cálculos de total da bota intactos; recorte usa `findFichaPrice` (R$ 0 se admin não definir).
