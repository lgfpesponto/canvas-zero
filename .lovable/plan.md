Gerar um PDF (entregue aqui no chat) consolidando **todos os itens cobrados** na composição do pedido de Bota, agrupados por categoria, com nome da variação e valor unitário em R$.

## O que entra no PDF

Fontes de dados (somente itens ativos com `preco > 0`):
1. **`ficha_variacoes`** da ficha Bota (preço base oficial por variação).
2. **`custom_options`** (opções extras administrativas — bordados/lasers/recortes adicionais cadastrados fora da ficha clássica).

## Estrutura do documento

- Capa: "Tabela de Composição — Bota (7Estrivos)" + data de geração.
- Seções, na ordem em que aparecem no formulário do pedido:
  1. **Modelos** (Bota Tradicional, Peão, Montaria, Botina, etc.) — valor base do modelo.
  2. **Solados / Cor da Sola / Formato do Bico** (quando houver adicional).
  3. **Couros** (Cano, Gáspea, Taloneira) — quando a variação tiver adicional.
  4. **Bordados Cano** (lista completa com preço).
  5. **Bordados Gáspea**.
  6. **Bordados Taloneira**.
  7. **Lasers** (Cano / Gáspea / Taloneira).
  8. **Recortes** (Cano / Gáspea / Taloneira).
  9. **Personalização / Nome bordado / Carimbo / Estampa / Pintura / Costura atrás**.
  10. **Metais e Acessórios** (Strass, Cruz Metal, Bridão, etc.).
  11. **Tiras / Trisce / Vivo / Borrachinha / Linha** (se cobrados).
  12. **Kits e Adicionais** (qualquer categoria de `custom_options` restante).
- Cada seção em tabela de 2 colunas: **Item** | **Valor (R$)**, com zebra striping e totalizador de "quantidade de opções" no rodapé da seção.
- Rodapé: observação de que valores são unitários e que o preço final do pedido depende de combinações (ex.: Cor da Sola é contextual por modelo+solado+bico).

## Como vai ser gerado

- Script Python com `reportlab` (Platypus + Table) rodado via `code--exec`.
- Dados puxados via `supabase--read_query` das tabelas `ficha_tipos`, `ficha_categorias`, `ficha_campos`, `ficha_variacoes` e `custom_options`.
- Dedup: se a mesma variação existir em `ficha_variacoes` e `custom_options`, prevalece o valor de `ficha_variacoes` (regra de cascata do projeto).
- QA visual obrigatório: converter cada página em imagem e revisar antes de entregar.
- Arquivo final salvo em `/mnt/documents/tabela-composicao-bota.pdf` e disponibilizado como `<presentation-artifact>` aqui no chat.

## Fora do escopo

- Não inclui ficha de Cinto, Gravata, Regata ou Extras (só Bota, conforme pedido).
- Não inclui preço de "Bota Pronta Entrega" nem ajustes manuais — só a tabela de composição cobrável.