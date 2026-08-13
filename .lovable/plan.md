# Numeração automática de pedidos por prefixo

Cada vendedor passa a ter um prefixo próprio. Ao abrir qualquer tela de pedido, o número já vem preenchido como `prefixo-sequência` (ex: `2-345`), editável pelo vendedor, mas sem poder remover o prefixo. Pedidos de estoque e de produtos extras recebem um código no final (ex: `2-346EST`, `2-347PALMI`).

## Regras

- Formato: `PREFIXO` + `-` + sequência + (código opcional). O admin cadastra só o prefixo (ex: `2`); o portal monta o hífen.
- Sequência única por prefixo: conta todos os pedidos daquele prefixo, com ou sem código no final. Se o prefixo é novo, começa em 1 (`4-1`).
- O campo "Número do pedido" continua visível e editável, já pré-preenchido. Se o vendedor apagar o prefixo, o portal recoloca (o prefixo não pode ser removido).
- Continua valendo a checagem de número duplicado já existente (bloqueia salvar).

### Quem NÃO entra na regra
Vendedores sem prefixo cadastrado, `estoque`, `juliana`, `stefany`, `site` (Rancho Chique) e qualquer usuário com papel `vendedor_comissao`: número segue manual, como hoje.

### Campos Cliente / WhatsApp do cliente
Ocultos apenas para usuários com papel `vendedor` (ficha de bota, cinto, compra direta na página Modelos, compra de estoque e produtos extras). Admins, `vendedor_comissao` e demais papéis continuam vendo os campos.

### Códigos por tipo de pedido
| Tipo | Código |
|---|---|
| Bota por ficha | (sem código) |
| Compra de produto de estoque | EST |
| Tiras Laterais | TIRAS |
| Desmanchar | DESMAN |
| Kit Canivete | CANIVETE |
| Kit Faca | FACA |
| Carimbo a Fogo | CARIMBO |
| Revitalizador (unidade) | REVIT |
| Kit 2 Revitalizador | REVITKIT |
| Gravata Country | GRAVATA |
| Adicionar Metais | METAIS |
| Chaveiro c/ Carimbo a Fogo | CHAVCF |
| Bainha de Cartão | BCARTAO |
| Bainha de Celular | BCELULAR |
| Bota Pronta Entrega | ESTMAN |
| Gravata Pronta Entrega | GRAVATAETS |
| Palmilha | PALMI |

Observação: "Regata" e "Regata Pronta Entrega" existem no cadastro de extras e não têm código na sua lista — ficam sem código até você definir.

## Edição de usuários (prefixo)

Hoje o campo de prefixo existe na tela de usuários, mas o input remove qualquer caractere que não seja letra/número, então o prefixo fica só alfanumérico (o hífen passa a ser adicionado pelo portal, então isso está correto). Você relatou que não está conseguindo editar usuários — a primeira etapa é reproduzir esse erro na tela de Usuários (salvar um perfil e capturar a mensagem/console) e corrigir antes de cadastrar os prefixos. Nenhum perfil hoje tem prefixo definido, exceto Rancho Chique (`RC`).

## Detalhes técnicos

1. **Banco**: atualizar a função `next_order_numero(_prefixo)` para casar o padrão `^PREFIXO-\d+[A-Z]*$`, extrair só a parte numérica e devolver `PREFIXO-N+1`. Sequência única por prefixo, independente do código final.
2. **`src/hooks/useAutoOrderNumero.ts`**: adicionar `stefany` à lista de exceções e receber o papel do usuário para excluir `vendedor_comissao`; expor helpers `montarNumero(prefixo, seq, codigo)` e `garantirPrefixo(valor, prefixo)`.
3. **Novo `src/lib/orderCodigos.ts`**: mapa `extra_produtos.id` → código, mais `EST` para compra de estoque; função `codigoParaPedido(tipo)`.
4. **Telas**: `OrderPage`, `BeltOrderPage`, `ExtrasPage`, `DynamicOrderPage`, `ModelosPage` (dialog de compra) e `EstoqueBuyDialog`/`GradeEstoque` passam a pré-preencher o número com prefixo + sequência + código do tipo, mantendo o input editável com bloqueio de remoção do prefixo.
5. **Cliente/WhatsApp**: nas mesmas telas, esconder os inputs quando o papel do usuário for `vendedor` (gravando os campos vazios), sem alterar o comportamento para os demais papéis.
6. **Usuários**: investigar e corrigir a falha ao salvar em `UsersManagementPage`, e deixar claro no campo que o hífen é automático.
