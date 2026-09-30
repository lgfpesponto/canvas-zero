# Impedir NF-e duplicada, mostrar impressões e zerar campos fiscais

## Resultado
- Quando já existir uma NF-e **processando ou autorizada** para o pedido, remover/desativar **Gerar NF-e** em todos os lugares.
- Permitir uma nova tentativa quando a nota anterior estiver **rejeitada, com erro ou cancelada**.
- Na área expandida do pedido, mostrar dois botões fiscais:
  - **Imprimir NF-e**: DANFE A4.
  - **Imprimir etiqueta NF-e**: DANFE térmico 100 × 150 mm.
- Liberar esses botões somente quando houver NF-e autorizada; antes disso, exibi-los desativados com uma explicação clara.

## Proteção contra duplicidade
- Criar uma identificação explícita para distinguir nota normal, complementar e devolução.
- Adicionar uma trava no banco que permita somente uma nota normal ativa por pedido Bagy.
- Manter notas complementares e devoluções fora dessa trava.
- Revalidar imediatamente antes de reservar número e transmitir, evitando duplicidade mesmo com dois cliques ou duas telas abertas.

## Campos fiscais no DANFE
- Exibir **0,00** nos campos monetários fiscais sem preenchimento, incluindo BC ICMS, valor do ICMS e valor do IPI.
- Exibir **0,0000** para alíquota de ICMS vazia e **0,00** para alíquota de IPI vazia, seguindo o padrão mostrado.
- Aplicar a mesma regra nos totais fiscais vazios, sem inventar tributos: o zero representa ausência de valor informado.

## Integração da tela
- Reutilizar a nota mais recente já carregada pelo menu fiscal para controlar **Gerar NF-e**, o selo e os dois botões de impressão.
- Atualizar a linha do pedido após autorização, cancelamento ou nova tentativa para refletir o estado correto.

## Validação
- Conferir os cenários: sem nota, processando, autorizada, rejeitada, erro e cancelada.
- Confirmar que DANFE A4 e etiqueta usam somente uma nota autorizada com chave e protocolo.
- Gerar uma amostra do DANFE e verificar visualmente os campos fiscais zerados.
