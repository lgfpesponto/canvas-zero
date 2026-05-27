## Objetivo
Fazer o botão **Aprovar ajuste** funcionar novamente.

## Problema identificado
A falha não é no botão nem no frontend.
A RPC `decidir_ajuste_solicitacao` está quebrando ao tentar criar uma notificação em `comprovante_notificacoes` com:
- `comprovante_id = sol.id`

Só que `sol.id` é o ID de `order_ajuste_solicitacoes`, enquanto a tabela `comprovante_notificacoes` exige que `comprovante_id` exista em `revendedor_comprovantes`.

Por isso aparece o erro:
`violates foreign key constraint comprovante_notificacoes_comprovante_id_fkey`

## Correção proposta
1. Ajustar a lógica do banco para a aprovação de ajuste não gravar um `comprovante_id` inválido.
2. Manter a atualização do pedido normalmente quando aprovado:
   - atualizar `orders.preco`
   - marcar `preco_congelado = true`
   - registrar histórico e alteração
   - marcar a solicitação como `aprovado` ou `negado`
3. Corrigir a notificação do vendedor com uma destas abordagens seguras:
   - preferencial: usar uma notificação sem depender da FK de comprovante
   - alternativa: adaptar a estrutura da notificação para aceitar eventos de ajuste sem vínculo com `revendedor_comprovantes`
4. Validar o fluxo completo:
   - aprovar ajuste
   - negar ajuste
   - confirmar que não aparece mais erro de FK
   - confirmar que o status da solicitação muda corretamente

## Implementação técnica
### Opção recomendada
Alterar a RPC `decidir_ajuste_solicitacao` para **não reutilizar incorretamente** `comprovante_notificacoes` com ID de outra tabela.

A solução mais limpa é:
- registrar a mensagem em um canal compatível com ajuste de pedido
- ou permitir notificação sem FK obrigatória quando o evento não for comprovante

### Arquivos/áreas que vou tocar
- `supabase/migrations/...sql` para corrigir a função `decidir_ajuste_solicitacao`
- possivelmente a estrutura/política da tabela `comprovante_notificacoes`, se necessário para suportar ajuste sem comprovante
- validação rápida no frontend da página `SolicitacoesAjustePage.tsx`

## Resultado esperado
Depois da correção:
- o admin consegue aprovar o ajuste
- o pedido recebe o novo valor corretamente
- a solicitação sai de `pendente`
- o vendedor continua sendo notificado
- o erro de foreign key desaparece

## Observação
Os logs de refresh token que apareceram não são a causa desse bug; o bloqueio está mesmo na RPC de aprovação.