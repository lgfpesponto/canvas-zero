## Justificativa obrigatória em edições de pedido

Quando um `admin_master` ou `admin_producao` salvar qualquer edição em um pedido (novo OU antigo), aparecerá um modal pedindo uma justificativa. Sem texto preenchido, o salvar não prossegue. A justificativa entra no histórico de alterações e — quando a edição mexer no valor — também aparece na "Composição do Pedido" e no PDF de Cobrança.

### Regras

- **Quem precisa justificar**: somente `admin_master` e `admin_producao`. Vendedores continuam salvando sem essa etapa.
- **Quando aparece**: ao salvar qualquer edição que de fato altere algum campo (se nada mudou, salva direto sem pedir).
- **Vale para pedidos antigos também**: a regra é por evento de edição, não por pedido. Qualquer pedido — mesmo criado antes desta atualização — exigirá justificativa quando for editado a partir de agora. Edições antigas no histórico continuam exibidas como hoje, sem motivo (pois não tinham campo).
- **Composição do Pedido (tela + PDF de Cobrança)**: lista somente as justificativas de edições que alteraram o valor final (mudança em `preco`, `desconto`, `quantidade` ou nas estruturas de `extraDetalhes` que impactam total).
- **Histórico de Alterações**: lista todas as justificativas, junto a cada grupo (data, hora, autor, mudanças, motivo).

### Mudanças por arquivo

**`src/contexts/AuthContext.tsx`**
- Estender `OrderAlteracao` com `justificativa?: string` e `afetouValor?: boolean` (campos opcionais — registros antigos seguem válidos).
- `updateOrder(id, data, justificativa?)`: ao montar `changes`, anexar `justificativa` em cada item do grupo e marcar `afetouValor: true` quando alguma chave alterada for `preco | desconto | quantidade | extraDetalhes`.

**Novo `src/components/JustificativaDialog.tsx`**
- Modal reutilizável com `<Textarea>` obrigatória, botões Cancelar / Confirmar. Confirmar desabilitado enquanto vazio. Props: `open`, `title`, `onConfirm(motivo)`, `onCancel`.

**`src/pages/EditOrderPage.tsx`, `src/pages/EditExtrasPage.tsx`, `src/pages/EditBeltPage.tsx`**
- Antes de chamar `updateOrder`: se o usuário for admin (`admin_master` ou `admin_producao`) E houver diff vs estado atual, abrir `JustificativaDialog`. Ao confirmar, chamar `updateOrder(id, payload, justificativa)`.
- Sem diff: salva direto. Vendedor: salva direto como hoje.

**`src/pages/OrderDetailPage.tsx`**
- Mesmo wrapper nas chamadas de `updateOrder` que mutam campos do pedido por admin.
- Seção "Composição do Pedido": após o total/desconto, renderizar lista das justificativas com `afetouValor === true` (data, autor, motivo).
- Seção "Histórico de Alterações": adicionar linha "Motivo: ..." abaixo das descrições de cada grupo que tiver justificativa.

**`src/components/SpecializedReports.tsx` — `generateCobrancaPDF`**
- No bloco "COMPOSIÇÃO" de cada pedido, após os itens de preço, listar em linha menor as justificativas com `afetouValor === true` (`Motivo (DD/MM por Fulano): ...`). Recalcular altura/quebra de página considerando as linhas extras.

### Detalhes técnicos

- Coluna `orders.alteracoes` (jsonb) já existe; adicionar campos opcionais não exige migração.
- Detecção de "afetou valor" feita no contexto comparando `current` vs `data` nas chaves `preco`, `desconto`, `quantidade` e `JSON.stringify(extraDetalhes)`.
- Agrupamento existente (mesma data+hora+usuário) continua válido; pega-se `justificativa` do primeiro item do grupo.

### Fora do escopo

- Backfill de justificativa em alterações antigas (não tinham o campo — exibição condicional já trata).
- Fluxo de troca de status (cancelamento/regressão) — mantém o modal próprio que já existe.
