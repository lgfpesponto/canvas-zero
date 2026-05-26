## Confirmação dos números

Snapshot **Cobrança - Maria Gabriela - 19-05-2026** (`03bb791d…`, 1016 pedidos, R$ 354.376,80, 1191 pares).

Filtrando dentro desses 1016:
- **235 pedidos com bordado Florência** (em qualquer campo: cano/gáspea/taloneira)
- **218** com desconto exatamente **R$ 5,00** (migração indue)
- **7** com desconto **> R$ 5,00** ← os "suspeitos" pedidos pra você revisar
- 10 sem desconto

## O que vou entregar (3 arquivos em `/mnt/documents/`)

### 1. `Florencia_desconto_maior_5.xlsx`
Os 7 pedidos Florência com desconto > R$5. Colunas:
`número, cliente, modelo, bordado_cano, bordado_gaspea, bordado_taloneira, preco_unit, qtd, desconto, valor_final, valor_snapshot, delta, status, link_portal`

E no chat, lista clicável dos mesmos 7 com `https://portal.7estrivos.com.br/pedido/{id}`.

### 2. `Cobranca_FINAL_MariaGabriela_1016pedidos_26-05-2026.pdf`
Mesmo layout do PDF de Cobrança original (header igual, agrupado por status, totais por status no rodapé, paginação), mas refletindo o **valor ATUAL de cada pedido**, com:
- Coluna extra "Δ vs snapshot" (diferença em R$ vs o snapshot de 19/05)
- Linha final de total geral + total de delta acumulado
- Nota de rodapé explicando os 218 ajustes Florência (−R$ 1.090) + os 7 casos suspeitos

### 3. `Cobranca_FINAL_MariaGabriela_1016pedidos_26-05-2026.xlsx`
Planilha completa com os 1016 pedidos, mesmas colunas do PDF + colunas extras (`valor_snapshot`, `delta`, `link_portal`) e uma aba "Resumo" com:
- Total snapshot vs total atual
- Quantidade e valor por status
- Quantidade de Florências (total, com desc=5, com desc>5, sem desc)

## Importante (não muda nada no app)

Nenhum pedido será alterado. Só leitura + geração de arquivos. Qualquer correção de desconto/preço você faz manualmente depois.

Posso gerar?