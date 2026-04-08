

## Corrigir textos com escapes Unicode renderizados literalmente

### Problema

Nos arquivos JSX, sequencias como `\u00E7\u00E3o` estao aparecendo como texto literal na tela em vez de renderizar os caracteres corretos (ç, ã, ó, etc.). Isso acontece porque em JSX, `\u00E7` dentro de texto nao e interpretado como Unicode — precisa ser o caractere UTF-8 real.

Exemplos visiveis na tela:
- "produ\u00E7\u00E3o" em vez de "produção"
- "FA\u00C7A" em vez de "FAÇA"
- "Fa\u00E7a" em vez de "Faça"
- "relat\u00F3rios" em vez de "relatórios"

### Solucao

Substituir todas as sequencias `\uXXXX` pelo caractere UTF-8 correspondente em todos os arquivos afetados. Mapeamento:

- `\u00E7` → ç
- `\u00E3` → ã
- `\u00C7` → Ç
- `\u00F3` → ó
- `\u00ED` → í
- `\u00E9` → é
- `\u00E1` → á
- `\u00F5` → õ
- `\u00FA` → ú
- `\u00E2` → â
- `\u2014` → —

### Arquivos alterados

| Arquivo | Quantidade de substituicoes |
|---------|---------------------------|
| `src/pages/Index.tsx` | ~8 ocorrencias (hero, login section, dados de filtro) |
| `src/components/dashboard/AdminDashboard.tsx` | ~15 ocorrencias (titulos, labels, dialog texts) |
| `src/components/dashboard/VendedorDashboard.tsx` | ~5 ocorrencias (titulos, labels) |
| `src/components/dashboard/FernandaDashboard.tsx` | ~1 ocorrencia (sola rustica) |

Nenhuma funcionalidade sera alterada — apenas substituicao de escapes por caracteres reais.

