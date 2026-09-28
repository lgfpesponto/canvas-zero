# Emissão de NF-e (modelo 55) via proxy externo

## Respostas às 3 perguntas

1. **Estrutura fiscal existente:** já existe a fundação (Fase 1). Tabelas `nfe_config` (emitente, série, próximo número, ambiente), `nfe_notas`, `nfe_itens`, `nfe_eventos` e `nfe_tributacao_referencias` (NCM, CFOP, CST/CSOSN, alíquotas por referência), telas Configurações NF-e e Tributação, função de teste SEFAZ e acesso restrito (Juliana, Igor, Stefany ADM). **Não existe** montador de XML, provider fiscal nem integração com proxy.
2. **NCM dos produtos:** não há NCM nos pedidos nem nos produtos de estoque. A tabela de referências tributárias existe mas está **vazia** (0 cadastros) — portanto **nenhum CSOSN está cadastrado**; precisa da confirmação do contador (101 ou 102).
3. **Destinatário:** não há cadastro estruturado. Pedido tem só `cliente`, `cliente_whatsapp` e `cliente_cpf_cnpj`; revendedores têm nome, telefone e CPF/CNPJ, sem endereço nem IE. Pedidos vindos da Bagy têm endereço em JSON (aproveitável como pré-preenchimento).

## O que será construído

Decisões: destinatário pode ser **revendedor ou cliente final** (escolha na emissão); **uma nota por pedido**.

1. **Cadastro de destinatários** — nova tabela com tipo (revendedor/cliente), nome/razão social, CPF/CNPJ, IE (ou "isento/não contribuinte"), e-mail, telefone e endereço completo com código IBGE; vínculo opcional ao revendedor. Tela simples de cadastro/edição, com pré-preenchimento pelo endereço da Bagy quando existir.
2. **Tributação por tipo de produto** — mapear cada pedido a uma referência tributária (Bota, Cinto, Extras/Gravata etc.) para puxar NCM, CSOSN, origem, unidade. CFOP automático: 5102 se destinatário em SP, 6102 fora.
3. **Montador de XML NF-e 4.00** (`src/lib/fiscal/montarXmlNfe.ts`) — blocos ide, emit, dest, det (prod + ICMSSN + PIS/COFINS Simples), total/ICMSTot, transp (sem frete por padrão), pag, infAdic; chave de 44 dígitos com DV módulo 11; XML sem assinatura. Validações amigáveis antes de montar (falta NCM, falta endereço, etc.).
4. **Edge function `nfe-proxy`** — ações autorizar/evento/status; valida login e permissão NF-e; lê os 4 secrets; erros amigáveis 412 ("Proxy NF-e ainda não configurado" / "Certificado digital ainda não configurado"); repassa ao proxy com Bearer e retorna cStat/xMotivo/chave/protocolo.
5. **Provider** (`src/lib/fiscal/provider.ts` + `proxyProvider.ts`) — transmitir, cancelar, cartaCorrecao, consultarStatusServico.
6. **Botão "Emitir NF-e" no detalhe do pedido** (só para quem tem acesso NF-e) — escolhe destinatário, mostra prévia (itens, CFOP, total), transmite; grava em `nfe_notas`/`nfe_itens`, incrementa o próximo número com trava contra duplicidade; mostra status, chave, protocolo e rejeição; ações Cancelar e Carta de Correção com justificativa (registradas em `nfe_eventos`).
7. O botão "Testar conexão SEFAZ" passa a usar a ação `status` do proxy.

## Pendências que dependem de você

- **CSOSN** (101 ou 102) e **NCMs** de bota e cinto — confirmar com o contador; o sistema bloqueia a emissão enquanto a referência estiver sem esses dados.
- **Certificado** (base64 do .pfx) e **senha** — serão pedidos por formulário seguro, não pelo chat.
- **Segurança:** o token do proxy foi colado em texto no chat. Recomendo gerar um novo no proxy e salvá-lo pelo formulário seguro. A URL e o token serão gravados como secrets, nunca no código.
- Começar tudo em **homologação** (ambiente 2) até a primeira nota de teste autorizar.

## Detalhes técnicos

- Migração: tabela `nfe_destinatarios` (GRANT authenticated/service_role, RLS via `has_nfe_access`), `orders.nfe_destinatario_id` opcional, coluna `csosn` em `nfe_tributacao_referencias` (ou uso de `cst_icms`), RPC `reservar_numero_nfe()` security definer com `FOR UPDATE` em `nfe_config`.
- Valores do item: `getOrderFinalValue` (com desconto) — pedidos de valor zero (ERRO) não permitem emissão.
- Edge function com CORS padrão, validação Zod do corpo, timeout e log sem expor secrets.
