# Enter avançando campo a campo na ficha

## O que está acontecendo

A navegação por Enter é ligada uma única vez, logo depois que a página monta. Mas nesse instante o formulário ainda não existe na tela (a página mostra o carregamento da sessão antes de renderizar a ficha). Como o registro nunca é refeito, o resultado é: Enter não faz nada, o campo do link da foto não vem focado e as listas de variação não abrem sozinhas.

Confirmado em `src/pages/OrderPage.tsx` (retorno antecipado enquanto a autenticação carrega) e em `src/hooks/useFichaKeyboardNav.ts` (efeito com dependências fixas, sem reagir ao formulário aparecer).

## Correções

1. **Ligar a navegação quando a ficha realmente aparece** — o Enter passa a funcionar desde o primeiro campo (link da foto), que também volta a vir focado ao abrir a ficha.
2. **Sequência completa** — Enter percorre todos os campos visíveis na ordem visual da ficha, atravessando categorias (ao terminar Couros segue para Solados, e assim por diante), sem pular campos ainda vazios.
3. **Tem / Não tem** — o primeiro Enter confirma a escolha do campo; o segundo Enter avança. Quando a escolha for "Tem" e existir campo de descrição, o Enter leva primeiro para a descrição e depois segue.
4. **Observações** — Enter deixa de quebrar linha e passa para o próximo campo. Para quebra de linha manual continua valendo Shift + Enter.

Nenhuma regra de preço, validação ou cálculo muda.

## Detalhes técnicos

- `useFichaKeyboardNav.ts`: efeito passa a observar a existência do nó do formulário (retry curto / observer no container-pai) em vez de depender só do mount; mesma correção vale para o bloco de foco inicial.
- `useFichaKeyboardNav.ts`: remover o `return` antecipado em `TEXTAREA` — Enter sem Shift chama `focusNextFrom`; com Shift mantém a quebra de linha.
- `ToggleField` em `OrderPage.tsx`: handler próprio de `Enter` no `<select>` — confirma na primeira vez, avança na segunda, indo antes para o input de descrição quando o valor é "Tem".
- `fichaNav.ts`: `getNavElements` já ordena por posição visual e busca a partir do `form`, então a travessia entre categorias funciona assim que o listener for registrado; garantir que blocos colapsados/ocultos continuem ignorados.
- Corrigir de passagem o erro de runtime `Cannot access 'handleSaveDraft' before initialization` no efeito de atalhos (usar ref/ordem de declaração).
