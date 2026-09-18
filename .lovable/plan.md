# Ajustes no cabeçalho da ficha adesiva

## Alterações
- Mostrar apenas o primeiro nome do vendedor no cabeçalho da ficha adesiva.
- Aplicar a exceção **Maria Gabriela → Gabriela**; os demais nomes continuam usando a primeira palavra, como **Samuel Silva Plácido → Samuel**.
- Exibir a data somente como **dia/mês**, mantendo o horário atual quando houver e removendo o ano.
- Aumentar a fonte das três linhas do cabeçalho, preservando as duas colunas e a quebra automática para evitar sobreposição.

## Validação
- Gerar amostras com Samuel Silva Plácido e Maria Gabriela.
- Conferir visualmente nomes, data, alinhamento, margens e ausência de cortes ou sobreposições.
- Confirmar que corpo, QR code e canhoto permanecem inalterados.

## Detalhes técnicos
- Alterar somente o gerador da ficha adesiva em `src/lib/fichaAdesivaPdf.ts`.
- Reaproveitar o cálculo dinâmico de altura do cabeçalho após aumentar a fonte.
