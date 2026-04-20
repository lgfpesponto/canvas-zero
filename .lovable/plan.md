

## Dois problemas — diagnóstico e correção

### 1. "api.7estrivos.com.br está bloqueado" ao abrir comprovante

**Não é bug do app.** O log de rede mostra que a URL assinada do PDF foi gerada com sucesso (status 200). O bloqueio (`ERR_BLOCKED_BY_CLIENT`) vem do **próprio Microsoft Edge ou de uma extensão de bloqueador** instalada no seu navegador, que está marcando o domínio `api.7estrivos.com.br` como suspeito por algum motivo (provavelmente porque é um subdomínio recente sem reputação).

**Como vou resolver no app**: em vez de abrir o PDF/imagem em **nova aba** (que cai no bloqueio do navegador), vou exibir dentro de um **modal de visualização embutido** na própria página Financeiro. Como o conteúdo é carregado via fetch+blob (não como navegação), o bloqueador do Edge não interfere.

- **Para PDF**: abre num `<iframe>` dentro de um Dialog grande (90% da tela)
- **Para imagem (JPG/PNG/HEIC)**: abre num `<img>` dentro do mesmo Dialog
- Mantenho um botão "Baixar arquivo" no modal que faz download direto via blob, também imune ao bloqueador
- Função `openPdf` em `financeiroHelpers.ts` ganha versão nova `getSignedUrl(path)` que retorna a URL, e o componente decide o que fazer

**Arquivos**: `src/components/financeiro/financeiroHelpers.ts`, `src/components/financeiro/FinanceiroAReceber.tsx`, `src/components/financeiro/FinanceiroAPagar.tsx` (mesmo modal, reaproveitado).

### 2. "Duplicou o valor"

**Conferi o banco**: existe **apenas 1 registro** salvo (R$ 12.778,80, Débora Cristina, vendedor Rafael Silva, 02/04/2026). **Não houve duplicação real no banco**.

O que provavelmente você viu foi:
- O card do comprovante com status "Salvo" continuou aparecendo dentro do modal "Novo Recebimento", **e** a linha já apareceu na tabela embaixo → parece dois, mas é o mesmo
- OU: o resumo "Total recebido" no topo somou com algum outro registro antigo do mês

**Como vou resolver pra não confundir mais**:
- Depois de salvar com sucesso, **fechar o modal automaticamente** (já fecha, mas vou garantir que limpa antes de fechar) e **remover o card "Salvo" da lista interna** imediatamente, pra nunca dar a sensação visual de duplicata
- Adicionar uma **proteção contra clique duplo** no botão "Salvar Tudo" (desabilita enquanto `savingAll === true`, já tem, mas vou reforçar com guard)
- Adicionar **deduplicação por hash do arquivo** ao adicionar comprovantes: se o mesmo PDF/foto for arrastado duas vezes na mesma sessão, mostra aviso "este comprovante já foi adicionado" e ignora

**Arquivo**: `src/components/financeiro/FinanceiroAReceber.tsx` (mesmo padrão depois aplicado em A Pagar se quiser).

### O que NÃO mexo

- Lógica da Edge Function (extração via IA continua igual, está funcionando)
- Estrutura da tabela `financeiro_a_receber`
- Cálculo do resumo (Total/Empresa/Fornecedor)
- Upload pro Storage

### Validação (você faz depois)

1. Abrir Financeiro › A Receber, clicar no ícone de olho/PDF de um registro → deve abrir o visualizador embutido **sem cair no bloqueio do Edge**
2. Tentar baixar pelo botão "Baixar arquivo" do modal → deve funcionar mesmo com o bloqueador ativo
3. Registrar um novo recebimento → após salvar, o card desaparece e só aparece na tabela embaixo (sem sensação de duplicata)
4. Tentar arrastar o mesmo PDF duas vezes → segundo é ignorado com aviso

