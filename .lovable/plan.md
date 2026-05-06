# Limpar erros antigos do "Reportar problema"

## Diagnóstico
- O botão "Reportar problema desta página" não chama a edge function. Ele só preenche o campo de texto com os últimos erros capturados pela sessão atual do navegador (`getRecentErrors`).
- O buffer guarda até 20 erros desde que a aba foi aberta, sem timestamp visível e sem expiração.
- O erro `userClient.auth.getClaims is not a function` foi gerado antes da correção da função `admin-assistant`. A função já está corrigida e respondendo `200`, mas o erro continua "vivo" no buffer da aba — então toda vez que clica em "Reportar problema", ele aparece de novo no template.

## Objetivo
Fazer o "Reportar problema" mostrar apenas erros recentes e reais, e dar controle para descartar lixo antigo.

## Mudanças propostas

1. **Filtrar erros por janela de tempo**
   - Mostrar no template só os erros dos últimos 5 minutos.
   - Se não houver nada recente, escrever "(nenhum erro recente capturado)".

2. **Mostrar horário de cada erro no template**
   - Cada linha vira algo como `- [HH:mm] [tipo] mensagem` para a admin saber se é fresco ou antigo.

3. **Limpar buffer após reportar**
   - Ao clicar em "Reportar problema", após preencher o template, limpar o buffer (`clearRecentErrors`) para evitar que o mesmo erro reapareça em reports futuros.

4. **Botão "Limpar erros capturados"**
   - Pequeno botão ao lado do "Reportar problema" para a admin descartar manualmente o buffer quando souber que foi corrigido.

5. **Ignorar erros conhecidos como ruído**
   - Filtrar fora mensagens irrelevantes do Radix UI (`DialogContent requires a DialogTitle`, "Missing Description or aria-describedby") que poluem o relatório.

## Detalhes técnicos
- `src/lib/consoleErrorCapture.ts`: já guarda `ts` em ISO. Aproveitar para filtrar por janela e expor utilitário de filtragem.
- `src/components/admin/AdminAssistantPanel.tsx`: ajustar `handleReportProblem` para usar a janela de tempo, formatar horário, limpar buffer no fim e renderizar o novo botão "Limpar erros".
- Nenhuma mudança em edge function ou banco.

## Resultado esperado
- O botão "Reportar problema" deixa de mostrar o erro antigo de `getClaims`.
- A admin vê só erros realmente recentes e pode esvaziar o histórico de erros quando quiser.