## Reorganização visual do Portal Bordado

### 1. Cabeçalho-bloco unificado (scanners + PDF)
Envolver os elementos atuais num card branco com borda/sombra, separado por uma linha sutil do conteúdo abaixo. Layout:

```text
┌─ Cabeçalho de operações ──────────────────────────────────┐
│  [ ESCANEAR PARA DAR ENTRADA ]   ┌─ Resumo de baixas ──┐  │
│  (verde, grande)                  │ De [__] Até [__] PDF│  │
│  [ ESCANEAR PARA DAR BAIXA  ]    └─────────────────────┘  │
│  (laranja/primário, grande)                                │
└────────────────────────────────────────────────────────────┘
```

- Coluna esquerda (≈60%): dois botões grandes empilhados.
  - **Novo**: "ESCANEAR PARA DAR ENTRADA" — verde — abre modal igual ao de baixa, mas o RPC aplica `Entrada Bordado 7Estrivos` (status anterior do pedido qualquer; se já estiver em Entrada/Baixa avisa e ignora).
  - Existente: "ESCANEAR PARA DAR BAIXA" — primário — sem mudança de comportamento.
- Coluna direita (≈40%): card do PDF com título **"Resumo de baixas"** acima dos campos De/Até/PDF.

### 2. Modal de scan — clareza
- Título muda conforme a ação: "Dar entrada por scan" ou "Dar baixa por scan".
- Subtítulo destaca o progresso aplicado (já existe).
- Botão **"Concluir"** vira **"Fechar"** (era confuso — apenas fecha o modal e atualiza a lista; o scan já é aplicado a cada leitura). Mantém o "Dar baixa"/"Dar entrada" como submit explícito do que está digitado.
- Pequena legenda abaixo dos botões: *"Cada leitura aplica o progresso automaticamente. Use Fechar quando terminar."*

### 3. Campos de busca das colunas — cara de leitor de código
- Aumentar altura (`h-11`), texto maior (`text-sm`/`text-base`), borda mais grossa (`border-2`) e cor da coluna, fundo branco sólido, ícone de barcode (não lupa) à esquerda.
- Placeholder: **"Digite o nº do pedido ou escaneie..."**
- Visual semelhante ao input do modal de scan, ocupando largura total da coluna.

### 4. Botão verde de baixa rápida no card
Confirmar/explicitar comportamento: ao clicar no botão verde (`ArrowDownToLine`) de um pedido na coluna **Entrada Bordado 7Estrivos**, o pedido é movido imediatamente para **Baixa Bordado 7Estrivos** (RPC `bordado_baixar_pedido`), atualização otimista o tira da Entrada e adiciona na Baixa. É exatamente isso que já faz — apenas adicionar `title="Mover para Baixa Bordado 7Estrivos"` para deixar claro no hover.

### Detalhes técnicos
- Arquivo único: `src/pages/BordadoPortalPage.tsx`.
- Generalizar o modal scanner: novo state `scannerMode: 'entrada' | 'baixa' | null` substituindo `showScanner`. `aplicarBaixa` vira `aplicarStatus(orderId, novoStatus)`. Validação no `processScan`:
  - modo `entrada`: aceita qualquer pedido cujo status atual **não** seja `Entrada Bordado 7Estrivos` nem `Cancelado`; bloqueia se já em Entrada (mensagem) ou Baixa (mensagem informando que precisa ser movido manualmente).
  - modo `baixa`: comportamento atual (apenas pedidos em Entrada).
- Cores/ícones do botão "Entrada": verde-600 + ícone `ArrowUpToLine` ou `LogIn`.
- Sem mudanças em RPCs, PDF, ou outras telas.
