# Avisar duplicidade já ao anexar o comprovante

## O que foi verificado

No banco existe apenas **um** comprovante de R$ 17.290,06 de 25/07/2026 (JULIANA CRISTINA RIBEIRO, doc 305998), do Rafael Silva. Ou seja, a trava criada ontem funcionou: o duplicado do print **não foi gravado**. O que faltou foi aviso: o arquivo aparece como "Pronto" e o botão "Salvar" fica habilitado como se estivesse tudo certo, e o bloqueio só aparece depois de clicar em salvar.

## O que muda

1. **Checagem imediata**: assim que a leitura automática termina (data, valor e pagador extraídos), o sistema já consulta o banco e verifica duplicidade — mesmo arquivo, ou mesmo valor + data + pagador daquele vendedor.
2. **Marcação visual**: se for duplicado, o item deixa de ficar "Pronto" e passa a mostrar a tag vermelha **"Duplicado"** com a explicação (valor, data, pagador e quando o original foi enviado).
3. **Botão bloqueado**: o botão "Salvar" desconsidera os itens duplicados. Se todos forem duplicados, o botão fica desabilitado com o texto "Nenhum comprovante novo".
4. **Recheca ao trocar de vendedor**: como a duplicidade é por vendedor, ao mudar o vendedor selecionado a verificação roda de novo em todos os itens da lista.
5. A trava no banco continua como rede de segurança final — nada muda nela.

## Detalhes técnicos

- `src/components/financeiro/saldo/EnviarComprovanteDialog.tsx`:
  - extrair a lógica de duplicidade (hash + trio com pagador normalizado) para uma função `checkDuplicate(item, vendedor)` reutilizada tanto na checagem imediata quanto no envio;
  - novo status de item `duplicate` com `dupInfo` (valor, data, pagador, data de envio do original), renderizado como badge destrutiva no card;
  - rodar a checagem ao final de `processFile` e num `useEffect` que observa `targetVendedor`;
  - `readyCount` e `handleSendAll` passam a ignorar itens `duplicate`.
