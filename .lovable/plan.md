

## Melhorar layout dos cards nos quadros de solados

### Alterações em `src/components/SoladoBoard.tsx` (linhas 254-296)

#### 1. Botão "Feito" move para o lado direito
Remover o botão "Feito" do lado esquerdo e colocá-lo no lado direito, junto com prazo, status e data.

#### 2. Labels nas informações do lado direito + separadores
Cada informação ganha label explícito e separador horizontal entre elas:
```
Prazo: 15d úteis
─────────────────
Status: Corte
─────────────────
Data: 06/04/2026
─────────────────
[Feito]
```

#### 3. Data em formato dd/mm/aaaa
Formatar `o.dataCriacao` para `dd/mm/aaaa` (se já não estiver).

#### 4. Descrição da sola em 2 linhas
Dividir os campos da descrição em duas linhas para não crescer horizontalmente:
- Linha 1: Tamanho · Gênero · Tipo · Formato
- Linha 2: Cor · Vira · Forma

#### 5. Separadores entre pedidos
Trocar `space-y-2` por `divide-y divide-border` nos cards, e remover o `bg-muted/50 rounded-lg` individual, usando apenas padding e a linha divisória.

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/components/SoladoBoard.tsx` | Layout do card: botão Feito no lado direito, labels com separadores, data dd/mm/aaaa, descrição em 2 linhas, linhas divisórias entre pedidos |

