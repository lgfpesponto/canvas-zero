# Notas Fiscais em Configurações

## O que muda para você
Em **Configurações** ficam duas opções separadas:
1. **Configurações NF-e**: a tela atual (emitente, certificado, teste SEFAZ, tributação). Só troca o nome.
2. **Notas Fiscais** (nova): um resumo e a lista de todas as notas geradas no sistema, no modelo dos prints.

## Tela "Notas Fiscais"
- **Resumo no topo**: quantidade e valor das notas autorizadas no período, e quantas estão canceladas, rejeitadas ou em rascunho.
- **Abas Saídas / Entradas**: vendas ficam em Saídas; devoluções (notas de entrada) ficam em Entradas.
- **Filtros**: período (de/até), status, cliente, com os botões Filtrar e Limpar.
- **Lista**: nº da nota, destinatário, data de emissão, valor, ambiente (Homolog/Produção), selo de status e paginação.
- **Três pontinhos em cada nota**: as mesmas ações do menu dos pedidos Bagy (e-mail, WhatsApp, espelho, cancelar, carta de correção, complementar, DANFE, devolução, excluir rascunho), valendo para qualquer nota: de pedido do portal, Bagy ou avulsa.
- **Botão "Nova Nota Fiscal"**: abre um formulário para emitir uma nota avulsa, sem pedido, no modelo dos prints:
  - Cabeçalho: natureza da operação, finalidade, presença, consumidor final, data e hora
  - Destinatário: escolhe um cliente cadastrado ou cadastra um novo, com busca de CEP
  - Itens: referência, descrição, NCM automático pelo nome do produto, CFOP, unidade, quantidade e valor
  - Totais: frete, seguro, outras despesas, desconto
  - Transporte, pagamento e informações adicionais
  - Aviso vermelho no topo com tudo o que falta preencher
  - Botões **Pré-visualizar**, **Salvar rascunho** e **Emitir NF-e**; a nota só vai para a SEFAZ depois da sua confirmação

## Quem acessa
Quem já tem permissão de NF-e (Juliana e Igor). A opção que o Igor tem hoje no menu principal passa a abrir a tela Notas Fiscais.

## Detalhes técnicos
- `AdminConfigPage.tsx`: seções `nfe` (renomeada para "Configurações NF-e") e `notas-fiscais`, ambas com `hasNfeAccess`.
- Nova rota `/notas-fiscais` para o Igor, que não vê Configurações.
- Novos arquivos: `src/pages/NotasFiscaisPage.tsx` (resumo, filtros, lista paginada de `nfe_notas`), `src/components/fiscal/NfeAcoesMenu.tsx` (o `BagyNfeMenu` passa a receber `notaId` em vez de pedido Bagy, e o menu Bagy reaproveita esse componente), `src/components/fiscal/NovaNotaFiscalForm.tsx`.
- Saídas/Entradas: separa pela natureza da operação (DEVOLUÇÃO = entrada), sem alterar o banco.
- Emissão avulsa: função `emitirNotaAvulsa` em `src/lib/fiscal/`, que reutiliza reserva de número, montagem de XML e `chamar('autorizar')`. O rascunho é gravado em `nfe_notas` com status `rascunho`.
- Nenhuma mudança no banco é prevista.
