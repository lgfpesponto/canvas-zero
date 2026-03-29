

## Alterar nome do arquivo PDF nos relatórios Cobrança e Expedição

### Alterações

**Arquivo**: `src/components/SpecializedReports.tsx`

#### 1. Expedição (linha 827)
Substituir:
```
doc.save('relatorio-expedicao.pdf');
```
Por formato dinâmico usando as variáveis já disponíveis (`vendedorLabel`, `geradoEm`, `totalValor`, `totalQtd`):
```
Expedição - {vendedor} - {data} - {valor total} - {qtd total} pares.pdf
```
Exemplo: `Expedição - João Silva - 29-03-2026 - R$ 5.400,00 - 37 pares.pdf`

#### 2. Cobrança (linha 1042)
Mesmo padrão:
```
Cobrança - {vendedor} - {data} - {valor total} - {qtd total} pares.pdf
```

A data usará formato com traços (`29-03-2026`) para compatibilidade com nomes de arquivo. O valor será formatado com `formatCurrency` e caracteres inválidos (`$`, `,`) sanitizados para nome de arquivo.

