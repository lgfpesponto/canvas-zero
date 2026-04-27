# Corrigir scanner de código de barras (perda de foco e leitura única)

## Problema observado

Na tela **Meus Pedidos → Escanear Código** (admin), depois de bipar o primeiro pedido o usuário precisa clicar de volta no campo para conseguir bipar o próximo. Resultado: na prática só um código é selecionado por vez.

## Causa

No componente `src/pages/ReportsPage.tsx`, quando o primeiro código é lido:

1. O re-render mostra a área "Último pedido lido" + contador de selecionados + botão "Visualizar pedidos".
2. Esses elementos novos entram no DOM e o navegador, em alguns casos (especialmente quando o leitor envia caracteres durante o re-render), perde o foco do `<input>`.
3. O `autoFocus` só roda na montagem, e o `useEffect` que reaplica o foco depende apenas de `showScanner` — não roda mais depois da primeira abertura.
4. Se o leitor começa a enviar a próxima leitura enquanto o input está sem foco, os caracteres caem em outro lugar (ex.: `body`) e nada acontece — daí a sensação de "só lê um código".

Outro ponto: o botão "Buscar" tem `disabled={scanning}` e o input não — mas como o foco está perdido, o leitor não consegue digitar de qualquer jeito.

## O que será alterado

Arquivo único: `src/pages/ReportsPage.tsx`

1. **Foco "grudento" no input do scanner**
   - Adicionar `onBlur` no `<input ref={scanInputRef}>`: enquanto `showScanner` estiver aberto, se o input perder foco e o novo elemento focado **não** for um botão/dialog dentro do painel do scanner, reaplicar foco via `requestAnimationFrame`.
   - Capturar também eventos de teclado em nível de `document` enquanto o scanner está aberto: se uma tecla imprimível chegar e o foco não estiver no input, redirecionar o foco antes do próximo caractere se perder.

2. **Reaplicar foco em todo render relevante do painel**
   - Trocar o `useEffect([showScanner])` por um efeito que também reage a `lastScannedNumero`, `selectedIds.size` e `scanning`, garantindo que o input volte a receber foco depois de cada leitura processada.

3. **Não bloquear leituras simultâneas**
   - O fluxo atual já tem `scanQueueRef` para enfileirar, mas hoje o input fica visualmente "Buscando..." e o usuário hesita. Manter o input **sempre habilitado** (já está) e ajustar o placeholder para deixar claro que pode bipar o próximo enquanto processa.

4. **Evitar perder caracteres durante o reset**
   - Em `handleScan`, fazer `setScanValue('')` e o refoco juntos antes de qualquer await, para que o input já esteja pronto para o próximo bip imediatamente.

5. **Não trocar o botão "Visualizar pedidos" para fora durante o scan**
   - Pequena reordenação visual: o bloco "Último pedido lido" já existe; garantir que sua aparição não desmonte o input (mantê-lo sempre montado, só mostrar/ocultar texto interno).

Sem mudanças em banco, hooks ou outros arquivos.

## Resultado esperado

- Bipar vários códigos seguidos sem precisar clicar no campo entre as leituras.
- Indicador "Buscando..." continua aparecendo, mas não impede a próxima leitura (ela entra na fila e é processada em sequência).
- Se uma leitura cair fora do input por qualquer motivo, o foco é restaurado automaticamente antes do próximo caractere.
