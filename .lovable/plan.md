
Objetivo: corrigir definitivamente a colisão de código de barras (caso “PEDRO MACBOOT”) para pedidos já existentes e novos, e parar o erro de leitura que sempre retorna esse pedido ao escanear.

1) Corrigir a regra base do barcode (raiz do bug)
- Arquivo: `src/contexts/AuthContext.tsx`
- Problema atual: `orderBarcodeValue(numero)` remove tudo que não é dígito e faz `padStart(10, '0')`.  
  Para `numero = "PEDRO MACBOOT"`, o resultado vira `0000000000`, gerando colisão.
- Alteração planejada:
  - Manter uma função de compatibilidade legada (formato antigo) para leitura de etiquetas antigas.
  - Criar/ajustar a função principal para gerar barcode único por pedido usando o `id` do pedido (token estável e único), não apenas `numero`.
  - Criar helper único de comparação de leitura (scan) para centralizar lógica e evitar regras inconsistentes.

2) Corrigir o scanner da lista de pedidos (onde está o “puxa sempre PEDRO MACBOOT”)
- Arquivo: `src/pages/ReportsPage.tsx`
- Problema atual: `trimmed.endsWith(o.numero.replace(/\D/g, ''))`
  - Se `o.numero` não tem dígitos, `replace` retorna `''`.
  - `string.endsWith('')` é sempre `true`, causando match indevido.
- Alteração planejada:
  - Remover essa comparação perigosa.
  - Usar o novo helper central de match (AuthContext), suportando:
    - barcode novo (baseado em ID),
    - número do pedido digitado manualmente,
    - barcode legado (para papéis antigos).

3) Corrigir o scanner da página de detalhe do pedido
- Arquivo: `src/pages/OrderDetailPage.tsx`
- Alteração planejada:
  - Trocar a lógica local de comparação por uso do mesmo helper central.
  - Garantir comportamento idêntico ao scanner da lista (sem divergência).

4) Corrigir geração de barcode no PDF da ficha de produção (canhotos)
- Arquivo: `src/pages/ReportsPage.tsx`
- Alteração planejada:
  - Nos pontos de geração dos canhotos (`bcVal`), passar `order.id` para gerar barcode único real por pedido.
  - Resultado: pedidos já existentes passam a sair com barcode correto ao reimprimir o PDF (sem precisar alterar dados antigos no banco).

5) Compatibilidade com pedidos já gerados
- Não será necessário migrar tabela para corrigir o problema de barcode.
- O conserto será em tempo de renderização/scan:
  - PDFs novos/reimpressos já saem corretos para pedidos antigos.
  - Scanner continuará reconhecendo etiquetas antigas via fallback legado.

6) Validação pós-implementação (E2E)
- Gerar ficha de produção com vários pedidos (incluindo o “PEDRO MACBOOT”) e confirmar que os barcodes são diferentes.
- Escanear na lista e no detalhe:
  - cada barcode abre/seleciona o pedido correto,
  - não “cai” sempre no PEDRO.
- Criar novos pedidos (numérico e texto) e repetir teste para confirmar que os próximos já entram sem colisão.

Detalhes técnicos (resumo)
```text
Antes:
barcode = digits(numero).padStart(10,'0')
scan-list = barcode == code OR numero == code OR code.endsWith(digits(numero))
--> colisão + match vazio perigoso

Depois:
barcode_novo = token_unico(order.id)
scan = match(code, barcode_novo) OR match(code, numero) OR match(code, barcode_legado)
sem endsWith com string vazia
```
