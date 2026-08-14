# Corrigir número automático na compra de produto de estoque

Na tela "Comprar do Estoque" o número do pedido fica vazio mesmo para vendedores com prefixo cadastrado (testado com a Gabi, prefixo `4`).

## Causa

Ao abrir o modal, dois comportamentos disputam o campo:

1. Um preenche o número sugerido (`4-NEST`).
2. Outro, que limpa o formulário (quantidades, vendedor, cliente, número), roda em seguida e apaga o número.

Como o número sugerido não muda depois disso, ele nunca volta a ser preenchido — o campo fica em branco.

## Correção

- Em `src/components/estoque/EstoqueBuyDialog.tsx`, no efeito de reset do formulário (o que roda ao abrir com produto), passar a definir o número como o sugerido quando a numeração automática estiver ativa, em vez de sempre limpar.
- Manter o efeito de preenchimento para o caso do número sugerido chegar depois (a consulta é assíncrona): ele já só preenche quando o campo está vazio.
- Nada muda para quem não tem prefixo (Estoque, Juliana, Stefany, Rancho Chique, vendedor comissão): o campo continua vazio e manual.

## Detalhe técnico

Trocar `setNumero('')` no efeito das linhas 96-109 por `setNumero(numeroIsAuto && autoNumero ? autoNumero : '')` e incluir `numeroIsAuto`/`autoNumero` nas dependências, preservando o efeito das linhas 77-80 como fallback assíncrono.
