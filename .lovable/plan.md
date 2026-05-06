Gerar um PDF a partir do CSV `Rafael_Alteracoes_03-05_para_06-05.csv` (64 pedidos) com o mesmo conteúdo: Pedido, Valor 03/05, Valor 06/05, Diferença e Justificativas.

**Layout**
- A4 retrato, fonte Helvetica
- Cabeçalho: "Relação de Alterações de Valores — 03/05 → 06/05"
- Subtítulo com totais: 03/05 R$ 53.816,40 → 06/05 R$ 52.586,40 (Diferença −R$ 1.230,00)
- Tabela com cabeçalho repetido a cada página (reportlab `LongTable`)
- Diferenças negativas em vermelho, positivas em verde
- Linha final TOTAL
- Rodapé com numeração de páginas

**Saída**
- `/mnt/documents/Rafael_Alteracoes_03-05_para_06-05.pdf`
- QA visual com pdftoppm antes de entregar