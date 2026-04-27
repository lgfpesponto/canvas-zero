## Trocar "revendedor(es)" por "vendedor(es)" na aba Financeira

Substitui apenas o **texto visível** ao usuário no módulo Financeiro. Nomes de tabelas, colunas, funções RPC, tipos TypeScript, nomes de arquivos e variáveis internas ficam intactos para não quebrar a integração com o banco e com o restante do sistema.

### O que muda na tela

**`src/pages/FinanceiroPage.tsx`**
- Aba "Saldo do Revendedor" → "Saldo do Vendedor"
- Comentário "comprovantes do revendedor" → "comprovantes do vendedor"

**`src/components/financeiro/saldo/FinanceiroSaldoRevendedor.tsx`**
- Título "Saldo por revendedor" → "Saldo por vendedor"
- Cabeçalho da tabela "Revendedor" → "Vendedor"

**`src/components/financeiro/saldo/ComprovantesPorRevendedor.tsx`**
- Título "Comprovantes por revendedor" → "Comprovantes por vendedor"
- Texto explicativo, label do seletor, placeholders e mensagens vazias ("Nenhum revendedor disponível", "Escolha um revendedor…", "Esse revendedor ainda não tem comprovantes.")
- Mensagem do AlertDialog ("debitar X do saldo de Y") permanece, só substitui a palavra quando aparece.

**`src/components/financeiro/saldo/ComprovantesRevendedorPendentes.tsx`**
- Título padrão "Comprovantes a entrar (revendedores)" → "Comprovantes a entrar (vendedores)"
- Botão "Enviar comprovante de revendedor" → "Enviar comprovante de vendedor"
- Mensagem "Nenhum comprovante de revendedor aguardando aprovação." → "Nenhum comprovante de vendedor…"
- Cabeçalho "Revendedor" → "Vendedor"
- Texto do AlertDialog "será exibido para o revendedor" → "será exibido para o vendedor"

**`src/components/financeiro/saldo/EnviarComprovanteDialog.tsx`**
- Título "Enviar comprovante em nome de revendedor" → "Enviar comprovante em nome de vendedor"
- Label "Revendedor" → "Vendedor"
- Placeholder "Selecione o revendedor" → "Selecione o vendedor"
- Toasts "Erro ao carregar revendedores" / "Escolha o revendedor antes de enviar" → "vendedor(es)"
- Texto "lançado em nome desse revendedor" → "…desse vendedor"

**`src/components/financeiro/saldo/DetalhesRevendedorDrawer.tsx`**
- Mensagens "Saldo do revendedor não foi alterado", "do revendedor e o pedido…", "O saldo do revendedor não será alterado" → "vendedor"

**`src/components/financeiro/FinanceiroAReceber.tsx`**
- Comentário "Comprovantes enviados pelos revendedores aguardando aprovação" → "…pelos vendedores…"

**`src/components/dashboard/AdminDashboard.tsx`** (banner que leva à aba financeira)
- Texto "X comprovantes enviados pelos revendedores · Total Y" → "…pelos vendedores…"

### O que NÃO muda (mantém estabilidade)

- Tabelas Supabase (`revendedor_comprovantes`, `revendedor_saldo_movimentos`, `revendedor_baixas_pedido`, `revendedor_saldo_visibilidade`) e funções RPC (`aprovar_comprovante_revendedor` etc.).
- Tipos TypeScript (`RevendedorComprovante`, `RevendedorSaldo`, `RevendedorMovimento`, `RevendedorBaixa`).
- Nomes de arquivos, componentes, variáveis e rotas (`/financeiro/saldo`, `RevendedorSaldoPage`, `FinanceiroSaldoRevendedor`, etc.).
- Página "Meu Saldo" do próprio vendedor (já usa "Meu Saldo", sem a palavra "revendedor").
- Item de menu "MEU SALDO" no Header.

### Resultado

Toda a área Financeira passa a falar "vendedor" em vez de "revendedor", mantendo o sistema estável e sem migração de banco.
