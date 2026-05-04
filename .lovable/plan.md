# Ajustes Portal Bordado

## 1. PDF resumo aceitar período (não só um dia)

**`src/pages/BordadoPortalPage.tsx`**
- Substituir o estado `pdfDate` por `pdfDe` e `pdfAte` (ambos pré-preenchidos com hoje em America/Sao_Paulo).
- UI: dois `<input type="date">` lado a lado dentro do card "PDF resumo", labels "De" e "Até".
- Em `gerarPDF`: passar `_de: pdfDe, _ate: pdfAte` para `find_orders_by_status_change`.
- Validar `pdfDe <= pdfAte` (toast de erro se não).
- Chamar `generateBordadoBaixaResumoPDF(list, pdfDe, pdfAte, userName)`.

**`src/lib/pdfGenerators.ts` — `generateBordadoBaixaResumoPDF`**
- Nova assinatura: `(orders, dataDe, dataAte, userName)`.
- Título: se `dataDe === dataAte` → "Resumo Baixa Bordado — DD/MM/AAAA"; caso contrário → "Resumo Baixa Bordado — DD/MM/AAAA a DD/MM/AAAA".
- Para cada pedido, percorrer `historico` filtrando entradas com `local === 'Baixa Bordado 7Estrivos'` cuja `data` esteja no intervalo `[dataDe, dataAte]`. Se houver mais de uma, listar todas (uma linha por baixa).
- Colunas: Nº pedido | Modelo/Tamanho | Vendedor | Data baixa | Hora baixa.
- Ordenar por data → hora → número do pedido.

## 2. Mensagem clara no scanner

**`src/pages/BordadoPortalPage.tsx` — `handleScan`**
- Quando `fetchOrderByScan` retorna `null` **ou** quando `found.status` não está em `BORDADO_STATUSES`:
  - `playBeep(false)` + toast: **"Pedido não está no bordado 7estrivos no momento"**.
- Remover as duas mensagens atuais ("Pedido não encontrado" e `Pedido em "X" — fora do bordado`) — uma única mensagem unificada.

## 3. Excluir baixas regredidas do PDF do dia

Regra: uma baixa só conta se, **no momento da geração**, o pedido ainda esteja em `Baixa Bordado 7Estrivos` ou em alguma etapa **posterior** do fluxo de produção. Se o pedido foi baixado e depois voltou para etapa anterior (ex.: voltou para Entrada Bordado, Sem bordado, Estampa, etc.), **não** entra no resumo.

**`src/pages/BordadoPortalPage.tsx` — `gerarPDF`**
- Após buscar `rows` pela RPC, filtrar:
  ```ts
  import { PRODUCTION_STATUSES } from '@/lib/order-logic';
  const baixaIdx = PRODUCTION_STATUSES.indexOf('Baixa Bordado 7Estrivos');
  const valid = list.filter(o => {
    const idx = PRODUCTION_STATUSES.indexOf(o.status);
    return idx >= baixaIdx; // status atual = baixa ou posterior
  });
  ```
- Se `valid.length === 0` → toast "Nenhum pedido baixado no período."
- Passar `valid` para o gerador.

> Observação: como `PRODUCTION_STATUSES` lista as etapas em ordem cronológica, "posterior à Baixa Bordado" cobre Pespontos, Montagem, Revisão, Expedição, baixas finais, Entregue, Conferido, Cobrado, Pago. Status especiais (`Cancelado`, `Aguardando`) ficam fora porque seu índice é diferente / anterior — confirmar a posição deles em `PRODUCTION_STATUSES` ao implementar; se necessário, excluí-los explicitamente.

## Arquivos tocados
- `src/pages/BordadoPortalPage.tsx`
- `src/lib/pdfGenerators.ts`

Sem migrações nem mudanças de RPC.
