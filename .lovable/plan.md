

## Botao expandir tela cheia + Labels no PDF

### 1. Botao expandir (tela cheia)

Adicionar um botao com icone `Maximize2` no header do quadro. Ao clicar, abre um `Dialog` (fullscreen) com o mesmo conteudo do quadro, mas sem o `max-h-[400px]` — permitindo ver todos os pedidos. O dialog usa `max-w-[95vw] max-h-[95vh]` com scroll interno.

- Importar `Dialog, DialogContent, DialogTitle` e `Maximize2` do lucide
- Adicionar state `expanded` (boolean)
- Botao no header ao lado dos outros
- Conteudo do dialog: reutilizar a mesma renderizacao de pedidos (extrair para funcao interna ou duplicar com classe diferente)

### 2. PDF — descricao da sola com labels

Na funcao `exportPDF`, mudar a construcao da `description` do bloco para usar labels na frente, igual aparece no quadro:

**Atual:** `borracha | quadrado | preta | rosa`

**Novo:** `Tipo: borracha  Formato: quadrado  Cor: preta  Vira: rosa`

Alterar a geracao do `key` e `description` (linhas 170-176) para montar com labels:
```
const parts = [
  o.solado && `Tipo: ${o.solado}`,
  o.formatoBico && `Formato: ${o.formatoBico}`,
  o.corSola && `Cor: ${o.corSola}`,
  o.corVira && `Vira: ${o.corVira}`,
].filter(Boolean);
description = parts.join('  ');
```

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/components/SoladoBoard.tsx` | Botao expandir com Dialog fullscreen + PDF description com labels |

