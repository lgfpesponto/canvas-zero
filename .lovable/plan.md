## Objetivo
Corrigir definitivamente o saldo dos revendedores para que:
- o resumo nunca mostre números incoerentes;
- o saldo reflita o livro-razão real;
- pedidos em `Cobrado` sem saldo suficiente apareçam como déficit (ex.: `-R$ 10,00`);
- a regra fique correta para todos os vendedores, não só para a Denise.

## O que vou implementar

### 1. Auditoria e correção do saldo histórico no banco
Criar uma migração para recalcular o livro-razão dos revendedores a partir dos movimentos reais e eliminar inconsistências de saldo acumulado.

Isso vai incluir:
- recalcular `saldo_anterior` e `saldo_posterior` de todos os movimentos por vendedor em ordem cronológica;
- tratar corretamente movimentos que não devem alterar saldo, como quitação histórica;
- validar e corrigir movimentos antigos que deixaram saldo negativo indevido durante baixas automáticas;
- preservar o histórico, sem apagar pedidos nem comprovantes.

### 2. Blindagem da baixa automática
Ajustar a função de baixa automática para garantir que:
- nenhuma baixa seja registrada se o saldo atual não cobrir o pedido naquele momento;
- o processamento FIFO pare no primeiro pedido que não couber no saldo;
- não seja possível gerar sequência de movimentos com `saldo_anterior` já negativo por erro de reprocessamento.

### 3. Revisão das rotinas que distorcem o saldo
Revisar e corrigir funções relacionadas para que não inflem `utilizado` ou `saldo` indevidamente:
- estorno automático por alteração de pedido;
- reprocessamento em massa de baixas automáticas;
- quitação histórica sem impacto em saldo;
- ajuste manual negativo/positivo.

### 4. Correção da UI do Financeiro
Atualizar a tela `/financeiro?tab=saldo` para que:
- os cards usem os números corrigidos do banco;
- o cartão do vendedor destaque claramente quando há pedidos cobrados sem cobertura;
- quando faltar saldo para o próximo pedido, o visor mostre o déficit em negativo (ex.: `-R$ 10,00`), em vez de esconder ou mostrar como valor positivo “faltante”;
- a lista FIFO do drawer siga a mesma lógica visual.

### 5. Validação com dados reais
Validar a correção com consulta real no banco, incluindo:
- Denise Garcia Feliciano;
- conferência amostral dos demais vendedores;
- comparação entre recebido, utilizado, estornos, saldo atual e pedidos cobrados pendentes.

## Resultado esperado
Depois disso:
- `Recebido - Utilizado + Estornos/Ajustes = Saldo` ficará consistente;
- não haverá vendedor com “mais utilizado do que recebido e ainda saldo positivo” sem justificativa contábil real;
- pedidos em `Cobrado` sem cobertura aparecerão como saldo negativo necessário para baixa;
- o comportamento ficará correto para todos os vendedores.

## Detalhes técnicos
- Vou mexer principalmente nas migrations do Supabase que definem:
  - `vw_revendedor_saldo`
  - `saldo_atual_revendedor(...)`
  - `tentar_baixa_automatica(...)`
  - triggers/funções de estorno e reprocessamento
- E na UI:
  - `src/components/financeiro/saldo/FinanceiroSaldoRevendedor.tsx`
  - `src/components/financeiro/saldo/DetalhesRevendedorDrawer.tsx`
- Não vou alterar regras de preço de pedidos; só a lógica financeira/saldo e a exibição do déficit.