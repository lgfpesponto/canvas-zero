## Objetivo
Preço editado no popover entra na soma final. Pedidos antigos mantêm o mesmo preço via cascata (nada muda até você editar). Fichas versionadas continuam apontando para a versão salva no pedido.

- Metais quantificáveis (Strass, Bola Grande, Cruz, Bridão, Cavalo) → popover mostra **"Preço quando 'Tem' unitário (R$)"**; soma = unitário × qtd, com unitário lido do banco.
- Extras tem/não tem (Tricê, Tiras, Franja, Corrente, Costura Atrás, Pintura, Estampa) → popover já vem com o valor atual preenchido; edição entra na soma.
- Bug do "Tipo do Metal" listar **Bola Grande** ao lado de **Rebite** → apagar essa variação do banco. Bola Grande fica só no bloco de metais quantificáveis.

## Cascata de preço (sem quebrar pedidos antigos)
```
preço unitário = ficha_campos.opcoes[0].preco_adicional  (se admin salvou > 0)
              ↓ senão
              constante hardcoded original (STRASS_PRECO, TRICE_PRECO, …)
```
Enquanto o admin não editar, o valor permanece o do código = pedidos antigos ficam idênticos. Editou uma vez → é uma nova versão da ficha; pedidos novos usam o novo, pedidos antigos continuam com o preço já materializado no `preco` deles (o reconciliador só refaz quando algo do pedido muda).

## Alterações

**1. Novo `src/lib/dynamicUnitPrice.ts`**
- Map em memória + `getDynamicUnitPrice(slug, fallback)`.
- Hook `useSyncDynamicUnitPrices()` carrega `ficha_campos.opcoes` para os slugs cobertos e popula o map.
- Constante `QUANTIFIABLE_METAL_SLUGS` p/ label contextual.

**2. Montar hook uma vez** em `src/App.tsx` (dentro do `ChromeWrapper`).

**3. Trocar leitura das constantes** por `getDynamicUnitPrice('slug', CONSTANTE)` em:
- `src/lib/recomputeOrderPrice.ts` (fonte canônica)
- `src/pages/OrderPage.tsx` (preview + save)
- `src/pages/EditOrderPage.tsx` (idem)
- `src/pages/OrderDetailPage.tsx` (breakdown)
- `src/lib/cobrancaPdf.ts`, `src/lib/pdfGenerators.ts` (PDFs)

**4. Popover contextual** em `src/components/ficha-edit/FichaFieldControls.tsx`:
- Se slug ∈ `QUANTIFIABLE_METAL_SLUGS` → rótulo "Preço quando 'Tem' unitário (R$)" + dica "soma = unitário × quantidade".
- Caso contrário → mantém "Preço quando 'Tem' (R$)".

**5. Migração de dados (via `insert`)**
- `DELETE FROM ficha_variacoes WHERE id = 'ff434f3a-9015-4be5-aeb3-b8ed4579465a'` (Bola Grande em `tipo_metal`).
- `UPDATE ficha_campos SET opcoes = jsonb_build_array(jsonb_build_object('label','sim','preco_adicional', <constante>))` para os 12 slugs, quando `opcoes` estiver vazio. Assim o popover abre com o valor atual pré-preenchido no primeiro clique.

## Fora de escopo
- Sem mudança na lógica de soma (continua unitário × qtd, ou preço × 1).
- Sem tocar em fichas versionadas de pedidos antigos.
- Sem mudar Cor da Sola / Modelo / Solado / Bordados (já dinâmicos).