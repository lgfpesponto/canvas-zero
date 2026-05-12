## Renomear variações de Laser

As variações estão em `custom_options`. Vou aplicar uma migration que faz UPDATE só nos 4 registros abaixo (somente Gáspea e Taloneira, conforme pedido — laser_cano não será alterado):

| Categoria | Label atual | Novo label |
|---|---|---|
| laser_gaspea | Cassino / Baralho | Cassino / Baralho STE 91 |
| laser_gaspea | Pintura Cavalo | Pintura Cavalo STE 62 |
| laser_taloneira | Cassino / baralho | Cassino / Baralho STE 91 |
| laser_taloneira | Pintura Cavalo | Pintura Cavalo STE 62 |

Pedidos antigos que já estavam com o nome antigo continuam exibindo o texto salvo (não retroativo) — o preço continua R$ 50 (regra de Laser).

Observação: existe também "Pintura Cavalo" em **laser_cano** — você quer que eu renomeie lá também para manter consistência, ou deixo só Gáspea/Taloneira como pediu?