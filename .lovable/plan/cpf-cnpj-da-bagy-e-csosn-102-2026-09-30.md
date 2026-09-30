# CPF/CNPJ da Bagy e CSOSN 102

## O que está errado
- A Bagy manda o CPF/CNPJ do cliente no campo `customer.doc`. O portal procura esse dado em outros campos (cpf, document, cnpj), então 1.075 dos 1.076 pedidos Bagy estão sem CPF/CNPJ salvo. A nota fiscal também procura em `customer.cgc`, e não em `doc`.
- As referências de tributação BOTA, CINTO e EXTRAS estão sem CSOSN, por isso a nota acusa erro.

## O que muda
1. **Recebimento dos pedidos Bagy**: passar a ler `customer.doc`, sem pontos nem traços, além dos campos de hoje. Usar também `entity` (pessoa física ou jurídica) para saber se o número é CPF ou CNPJ.
2. **Montagem da nota**: buscar o documento nesta ordem: valor corrigido no portal → `customer.doc` → campos antigos. Assim os pedidos antigos também funcionam, mesmo sem ter o CPF/CNPJ salvo.
3. **Corrigir pedidos já importados**: preencher o CPF/CNPJ dos pedidos em que ele está vazio, mas que têm `customer.doc` no registro da Bagy (96 pedidos hoje).
4. **CSOSN 102 como padrão**: gravar 102 nas referências BOTA, CINTO e EXTRAS. Quando uma referência não tiver CSOSN, a nota usa 102 em vez de acusar erro. Continua dando para mudar o CSOSN na tela de Tributação.

## Detalhes técnicos
- `supabase/functions/bagy-webhook/index.ts`: incluir `"doc"` em `pick(customer, ...)` e aplicar `replace(/\D/g,'')`.
- `src/lib/fiscal/nfeBagy.ts` linha 59: `dig(p.cliente_doc || cust.doc || cust.cgc || cust.cpf || cust.cnpj)`. Linhas 88-98: usar `'102'` como padrão para o CSOSN e remover o erro de "sem CSOSN".
- Ajuste dos dados (run_sql): `update bagy_pedidos set cliente_doc = regexp_replace(payload->'customer'->>'doc','\D','','g') where cliente_doc is null and payload->'customer'->>'doc' is not null`. E também `update nfe_tributacao_referencias set csosn='102' where csosn is null`.
