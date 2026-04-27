# Corrigir scanner que perde a leitura contínua após o primeiro código

## Problema confirmado

O problema principal não é só “perda de foco”. Em `src/pages/ReportsPage.tsx`, o scanner do admin troca de layout depois da primeira leitura:

- antes da primeira leitura: renderiza o bloco simples (`selectedIds.size === 0`)
- depois da primeira leitura: renderiza outro bloco totalmente diferente (`selectedIds.size > 0`), em modal fullscreen

Essa troca desmonta o `<input>` original e monta outro no lugar. Para leitor de código de barras isso é crítico: a próxima leitura pode começar no meio dessa troca de DOM, então o foco some e o scanner parece funcionar só uma vez.

Além disso, o `onBlur` atual evita refocar se o foco cair em `button`, e justamente após a primeira leitura aparecem novos botões como “Visualizar pedidos”, “Mudar progresso” e “Limpar seleção”, o que favorece a perda de foco persistente.

## O que será alterado

### 1. Manter um único scanner montado o tempo todo
Arquivo: `src/pages/ReportsPage.tsx`

- Remover a troca brusca entre “scanner inicial” e “scanner com pedidos selecionados”.
- Manter o mesmo campo de leitura sempre montado do início ao fim.
- Mostrar contador, último pedido lido e lista de selecionados sem substituir o componente do input.

Resultado: o leitor continua digitando sempre no mesmo elemento, sem reset estrutural entre uma leitura e outra.

### 2. Endurecer a estratégia de refoco automático
Arquivo: `src/pages/ReportsPage.tsx`

- Ajustar `refocusScanInput` para reaplicar foco de forma mais agressiva enquanto o scanner estiver aberto.
- Trocar o `onBlur` por uma lógica que só permita perder foco de verdade ao fechar o scanner ou ao interagir explicitamente com controles que precisem disso.
- Não considerar a simples presença de botões no painel como motivo para abandonar o foco do scanner.

### 3. Blindar a transição logo após cada leitura
Arquivo: `src/pages/ReportsPage.tsx`

- Em `handleScan`, manter limpeza do campo e refoco antes do processamento assíncrono.
- Reforçar o refoco também após atualização de seleção, último pedido lido e abertura/fechamento da lista de pedidos.
- Garantir que leituras enfileiradas continuem indo para o mesmo input sem depender de clique manual.

### 4. Ajustar a UI para não competir com o scanner
Arquivo: `src/pages/ReportsPage.tsx`

- Deixar o botão “Buscar” como ação opcional manual, mas sem interferir no fluxo contínuo do leitor.
- Exibir “Buscando... pode escanear o próximo” sem bloquear a captura da próxima leitura.
- Evitar qualquer renderização condicional que troque o nó do input durante o uso.

## Resultado esperado

- Após ler um código, o próximo poderá ser lido imediatamente sem clicar no campo.
- O scanner continuará funcionando em sequência mesmo com “Último pedido lido” e lista de selecionados visíveis.
- Leituras rápidas continuarão entrando na fila e sendo processadas em ordem.

## Detalhes técnicos

Arquivo afetado: `src/pages/ReportsPage.tsx`

Abordagem:
- consolidar os dois blocos de scanner em uma única estrutura
- manter um único `ref` e um único `<input>` persistente
- revisar `onBlur`/`useEffect` para foco persistente real
- preservar a fila (`scanQueueRef`) já existente

Sem mudanças em banco, Supabase ou regras de negócio.
