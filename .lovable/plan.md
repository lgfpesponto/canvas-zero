# Impedir NF-e duplicada e mostrar impressões no pedido

## Resultado
- Quando já existir uma NF-e **processando ou autorizada** para o pedido, remover/desativar **Gerar NF-e** em todos os lugares.
- Permitir uma nova tentativa quando a nota anterior estiver **rejeitada, com erro ou cancelada**, conforme definido.
- Na área expandida do pedido, trocar o botão genérico de etiqueta por dois botões fiscais:
  - **Imprimir NF-e**: DANFE A4.
  - **Imprimir etiqueta NF-e**: DANFE térmico 100 × 150 mm.
- Exibir esses botões somente quando houver NF-e autorizada; antes disso, deixá-los desativados com uma explicação clara.

## Proteção contra duplicidade
- Criar uma identificação explícita para distinguir nota normal, complementar e devolução.
- Adicionar uma trava no banco que permita somente uma nota normal ativa por pedido Bagy.
- Manter notas complementares e devoluções fora dessa trava, preservando esses fluxos fiscais.
- Revalidar imediatamente antes de reservar número e transmitir, evitando duplicidade mesmo com dois cliques ou duas telas abertas.

## Integração da tela
- Reutilizar a nota mais recente já carregada pelo menu fiscal para controlar **Gerar NF-e**, o selo e os dois botões de impressão.
- Atualizar a linha do pedido após autorização, cancelamento ou nova tentativa para refletir o estado correto sem recarregar a página inteira.

## Validação
- Conferir os cenários: sem nota, processando, autorizada, rejeitada, erro e cancelada.
- Confirmar que DANFE A4 e etiqueta usam somente uma nota autorizada com chave e protocolo.
