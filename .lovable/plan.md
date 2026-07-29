## Problema

Na compra a partir do Estoque, a **Composição do Pedido** só mostra Modelo, Couros e Solado — some tudo que também soma preço (bordados, laser, glitter, personalização, tiras, trice, pintura, estampa, metais, acessórios, cor da linha/borrachinha, costura atrás, carimbo, sob medida, desenvolvimento, recortes).

## Causa raiz

Dois pontos, ambos precisam de correção:

1. **Snapshot incompleto no cadastro do estoque** (`src/pages/OrderPage.tsx`, linhas 1396–1409): quando o produto de estoque é pré-cadastrado, só 12 campos são salvos em `ficha_snapshot` (modelo, gênero, solado, formato_bico, cor_sola, cor_vira, tipos/cores de couro). Todos os outros campos da ficha que pesam no preço são descartados.
2. **Builder da composição limitado** (`src/lib/estoqueOrderComposition.ts`): mesmo se o snapshot tivesse os campos, `buildBotaComposicao` só sabe emitir linhas para modelo/couros/solado/cor sola/cor vira/formato bico.

Como a composição no detalhe do pedido é reconstruída a partir de `extra_detalhes.botas[i].ficha_snapshot` (gravado pela RPC `comprar_estoque` a partir do produto de estoque), os campos que nunca foram salvos simplesmente não aparecem.

## Escopo

- **Pedidos novos**: composição completa passa a aparecer automaticamente para tudo cadastrado no Estoque a partir de agora.
- **Pedidos antigos**: mantidos como estão (conforme decisão anterior do usuário de não fazer backfill).

## O que será feito

### 1. `src/pages/OrderPage.tsx` — expandir snapshot do estoque
No bloco `ficha_snapshot: { ... }` do pré-cadastro (~linha 1396), incluir todos os campos que pesam no preço/composição do pedido de bota, seguindo a mesma nomenclatura já usada pelo sistema:
- Bordados: `bordado_cano`, `bordado_gaspea`, `bordado_taloneira` + cores de bordado e descrições de bordado variado
- Recortes: `recorte_cano/gaspea/taloneira` e cores
- Personalização: `personalizacao_nome`, `personalizacao_bordado`, `nome_bordado_desc`
- Laser + glitter (cano/gáspea/taloneira)
- Pintura, estampa, trice/tirice + desc, tiras + desc, costura atrás
- Metais: `metais`, `tipo_metal`, `cor_metal`, `strass_qtd`, `cruz_metal_qtd`, `bridao_metal_qtd`
- `acessorios`, `desenvolvimento`, `sob_medida` + desc
- `cor_linha`, `cor_borrachinha`, `carimbo` + desc
- `tem_laser`
- `extra_detalhes` (para `desenvBordado/Laser/Estampa`, `cavaloMetal`, `franja`, `corrente`, etc.)
- `adicional_valor`, `adicional_desc`

### 2. `src/lib/estoqueOrderComposition.ts` — reconstrução completa
Expandir `buildBotaComposicao` para emitir linhas na mesma ordem/regras do `recomputeSubtotal` canônico, cobrindo todos os campos acima. Vai reutilizar as constantes já existentes (`BORDADOS_CANO/GASPEA/TALONEIRA`, `LASER_*_PRECO`, `GLITTER_*_PRECO`, `AREA_METAL`, `STRASS_PRECO`, `CRUZ_METAL_PRECO`, `BRIDAO_METAL_PRECO`, `CAVALO_METAL_PRECO`, `TRICE_PRECO`, `TIRAS_PRECO`, `PINTURA_PRECO`, `ESTAMPA_PRECO`, `NOME_BORDADO_PRECO`, `COSTURA_ATRAS_PRECO`, `SOB_MEDIDA_PRECO`, `DESENVOLVIMENTO`, `ACESSORIOS`, `CARIMBO`, `FRANJA_PRECO`, `CORRENTE_PRECO`) e o cascateamento com `findFichaPrice` para refletir sempre a versão atual da ficha, seguindo a mesma regra dos produtos de estoque.

Sem mudanças no banco.

## Confirmação

Já foi combinado antes que produtos de estoque criados antes da correção **não** recebem backfill. Se preferir que eu também gere um script de reprocessamento, é só me avisar depois.
