## Objetivo

Tornar o Portal Bordado mais claro e rápido: o botão grande passa a ser um scanner em massa que dá baixa direta em "Entrada Bordado 7Estrivos → Baixa Bordado 7Estrivos" (sem precisar escolher progresso). Cada coluna ganha sua própria busca, e cada card de Entrada ganha um botão de baixa rápida com 1 clique.

## Mudanças

### 1. Botão principal "ESCANEAR / BUSCAR PEDIDO" → "ESCANEAR ENTRADA → BAIXA"
- Renomear o botão grande laranja para deixar claro a função: dar baixa em pedidos da Entrada.
- Texto: **"ESCANEAR PARA DAR BAIXA"** com sub-texto pequeno *"Entrada Bordado → Baixa Bordado"*.
- Ao clicar, abre o **modal de scanner em massa** estilo admin (igual ao usado em `ReportsPage.tsx` linhas 724-860):
  - Painel escuro centralizado com input grande sticky-focus (refoco automático após cada leitura).
  - Mostra "Último pedido lido: ✅ N°" + contador "X pedidos baixados".
  - Lista expansível "Visualizar pedidos lidos" com X para remover.
  - Fila de scans para suportar leituras rápidas em sequência (mesmo padrão do `scanQueueRef`).
- **Diferença chave vs. admin**: não há seletor de progresso. Cada scan que retornar um pedido em `Entrada Bordado 7Estrivos` chama imediatamente o RPC `bordado_baixar_pedido` com `_novo_status: 'Baixa Bordado 7Estrivos'`. Beep verde + atualização da lista. Pedidos fora da entrada → beep vermelho + toast "Pedido não está em Entrada Bordado".
- Botões do modal: **"Concluir"** (fecha + refetch) e **"Limpar"**.

### 2. Busca individual em cada coluna (Entrada e Baixa)
- Dentro de cada `BordadoColumn` (`Entrada Bordado 7Estrivos` e `Baixa Bordado 7Estrivos`), adicionar um campo `<input>` no topo com ícone de lupa/scanner.
- Comportamento:
  - **Digitação manual** (sem Enter): filtra a lista da coluna em tempo real por `numero` contendo o texto.
  - **Enter ou scan completo** (heurística: input recebeu valor longo de uma vez ou Enter pressionado): chama `fetchOrderByScan` e, se o pedido pertence à coluna, navega para `/pedido/<id>`. Se não pertence, mostra toast claro.
- Campo persiste o valor digitado para feedback visual (filtro continua aplicado até limpar).
- Cada coluna tem seu próprio estado de busca (independentes).

### 3. Botão de baixa rápida em cada card da coluna "Entrada Bordado 7Estrivos"
- Adicionar um botão pequeno no canto direito de cada card (ícone `Check` ou `ArrowRight` verde) com tooltip "Dar baixa".
- Ao clicar (com `e.stopPropagation()` para não abrir o detalhe):
  - Confirmação leve via toast com botão "Desfazer" *ou* simplesmente executa direto e mostra toast de sucesso (mais ágil — recomendado).
  - Chama `supabase.rpc('bordado_baixar_pedido', { _order_id: o.id, _novo_status: 'Baixa Bordado 7Estrivos' })`.
  - Em sucesso: remove o card da Entrada e adiciona à Baixa via update otimista; toast verde "Pedido N° → Baixa Bordado".
  - Em erro: toast vermelho com a mensagem.
- Cards da coluna **Baixa** não recebem esse botão (só Entrada).

### 4. Layout mais clean
- Card do PDF reduzido visualmente (já está ok, manter).
- Botão principal vira card laranja com ícone grande + título + subtítulo, ocupando ~60% da largura no grid; PDF fica em ~40%.
- Espaçamento e tipografia ajustados para leitura rápida em tablet/celular do setor.

## Arquivos afetados

- `src/pages/BordadoPortalPage.tsx` — UI principal: novo modal de scan em massa, busca por coluna, botão de baixa nos cards, novo layout.
- *(Sem mudanças)* `src/components/BordadoOrderView.tsx`, `src/lib/pdfGenerators.ts`, RPCs ou migrações.

## Detalhes técnicos

- Reutilizar `fetchOrderByScan` e `playBeep` já existentes.
- RPC já existe e é usada pelo `BordadoOrderView.tsx`: `bordado_baixar_pedido(_order_id, _novo_status, _justificativa)`. Sem justificativa para baixa em massa (não é retrocesso).
- Estado novo no componente:
  - `scanQueueRef`, `scanProcessingRef` (igual ReportsPage).
  - `baixadosMap: Map<id, {numero, at}>` para mostrar histórico no modal.
  - `lastScanned: string | null`.
  - `searchEntrada: string`, `searchBaixa: string`.
- Após fechar o modal, executar `fetchOrders()` para garantir consistência.
- `useEffect` de sticky-focus no input do modal (padrão `requestAnimationFrame` do ReportsPage).

## Fora de escopo

- Não mexer na lógica de retrocesso (Baixa → Entrada continua exigindo justificativa via página de detalhe).
- PDF resumo, filtros de período e mensagem do scanner já implementados em iteração anterior — manter como está.
