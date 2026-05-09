## Objetivo

Trocar o dialog de envio de comprovantes do vendedor para ficar **igual ao print** do "Novo Recebimento (extração automática via IA)" usado pelo admin master, mas com o campo **"Vendedor (quem mandou)" travado** com o nome do vendedor logado. O fluxo continua o mesmo (`revendedor_comprovantes` com pendente / aprovado / reprovado, sino notificando).

## O que muda

1. **`EnviarComprovanteDialog.tsx`** — refatorar o layout para espelhar o dialog `Novo Recebimento` do `FinanceiroAReceber.tsx`:
   - Título: "Novo Recebimento (extração automática via IA)".
   - Primeiro campo: **"Vendedor (quem mandou)"**:
     - Quando aberto pelo vendedor (prop `vendedor` informada): mostra um `Select` **desabilitado** já com o nome do vendedor pré-selecionado (puxado do login via `useAuth().user.nomeCompleto`).
     - Quando aberto pelo admin (sem prop `vendedor`): mantém o seletor habilitado da lista de vendedores (comportamento atual).
   - Bloco "Comprovantes (PDF ou foto — pode arrastar vários)" com o mesmo dropzone tracejado e botão "Escolher arquivos / Nenhum arquivo escolhido".
   - Texto de ajuda: "Aceita PDF, JPG, PNG ou foto da tela. A IA extrai data, valor e destinatário automaticamente.".
   - Cards por arquivo extraído idênticos (badges Pronto/Lendo/Erro, data, valor, pago para, observação).
   - Botão final: **"Salvar N recebimento(s)"** com spinner enquanto envia.

2. **Sem mudanças de banco** — continua salvando em `revendedor_comprovantes` com `status='pendente'`, `vendedor` = nome do logado, `enviado_por = auth.uid()`. RLS já permite isso.

3. **Sem mudanças no fluxo de aprovação** — admin master continua aprovando/reprovando em `ComprovantesRevendedorPendentes`, trigger continua disparando notificação no sino.

4. **`RevendedorSaldoPage.tsx`** — sem mudanças estruturais; só garante que a prop `vendedor={vendedorName}` continue sendo passada (já é). Mantém a lista "Meus comprovantes enviados" abaixo.

## Detalhes técnicos

- O componente `EnviarComprovanteDialog` já tem o modo dual (`isAdminMode = !vendedor`). A mudança é apenas visual + adicionar o `Select` travado no modo vendedor (hoje ele simplesmente omite o campo).
- O `Select` no modo vendedor terá `disabled` + `value={vendedor}` + um único `SelectItem` com o nome — visualmente idêntico ao campo do print, só que não-clicável.
- Mantém validações atuais (hash de duplicidade, tamanho 10MB, valor>0, data obrigatória).
- Ajusta os textos do header/dropzone/botão para casarem 1:1 com o print.
- Atualiza `mem://features/financeiro/comprovantes-vendedor` registrando que a UI agora espelha o dialog do admin com vendedor travado pelo login.

## Fora do escopo

- Não muda a tabela `financeiro_a_receber` nem o fluxo do admin "A Receber".
- Não remove o sistema de aprovação pendente/aprovado/reprovado.
- Não muda a página de listagem de comprovantes do vendedor.
