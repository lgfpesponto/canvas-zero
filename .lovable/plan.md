### Ajuste no stepper da página de rastreamento público

**Arquivo:** `src/pages/PublicTrackingPage.tsx`

**Problema:** O último passo "Entregue ao vendedor" tem o texto em duas linhas, o que aumenta a altura total do bloco e desloca a bolinha para baixo em relação às outras (todas com texto de uma linha).

**Solução:** Isolar a bolinha em um container de altura fixa (`h-8` ou similar, centralizado) dentro de cada item do stepper, para que todas as bolinhas fiquem alinhadas horizontalmente independente do tamanho do texto. O texto continua abaixo da bolinha, naturalmente mais baixo onde houver mais linhas.

**Mudanças concretas:**
1. No JSX do stepper, envolver a `<div className="w-6 h-6 rounded-full ...">` em um `<div className="h-8 flex items-center justify-center">` para criar uma linha de base comum para todas as bolinhas.
2. Remover `items-center` do wrapper externo do stepper (`<div className="flex ... justify-between ...">`) e substituir por `items-start`, garantindo que os blocos inteiros se alinhem pelo topo e as bolinhas (agora em linha de base fixa) fiquem niveladas.

Resultado visual: todas as 8 bolinhas alinhadas na mesma horizontal; o rótulo "Entregue ao vendedor" aparece mais abaixo por ter duas linhas.