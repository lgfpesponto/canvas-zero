# Botão "Gerar Grade" para vendedores

## Situação verificada

- No banco, Gabi, Rafa, Samuel, Larissa, Denise, Fabiana e Mariana Ribeiro têm o papel `vendedor` (Mariana ADM é `admin_producao`).
- No código atual de `OrderPage.tsx` o botão já existe: ele aparece como um link pequeno de texto ("Gerar Grade") à direita do rótulo "Tamanho", só quando nenhuma grade foi montada ainda.
- Na captura enviada esse link não aparece, então ou a tela estava com versão antiga em cache, ou o link discreto no canto do rótulo está passando despercebido/quebrando no espaço disponível.

## O que fazer

1. Conferir na prática (navegador automatizado, sessão de vendedor) se o link está sendo renderizado na versão atual. Isso confirma se é cache ou renderização.
2. Independente do resultado, trocar o link discreto por um seletor claro acima do campo, no mesmo estilo do vendedor Estoque:
   - Dois botões lado a lado: **Tamanho único** (padrão) e **Gerar Grade**.
   - Escolhendo "Tamanho único" segue o select atual de tamanho.
   - Escolhendo "Gerar Grade" abre o modal de grade já existente; depois de montada, mostra o resumo ("X tam. / Y pedidos") com opção de editar ou voltar para tamanho único.
3. Manter o comportamento de salvamento que já existe: um pedido por par, numerado sequencialmente a partir do número base do vendedor.
4. Garantir que a navegação por Enter da ficha não pule esses botões nem quebre a sequência do formulário.

## Detalhes técnicos

- Arquivo: `src/pages/OrderPage.tsx`, bloco da seção Identificação (grid Tamanho/Gênero/Modelo).
- Condição de exibição continua `isVendedorComum` (papéis diferentes de admin/bordado/montagem) além do caso admin + vendedor Estoque/Juliana.
- Novo estado local de modo (`tamanhoUnico` | `grade`) apenas para controlar a UI; a lógica de submissão em lote (`addOrderBatch`) permanece intacta.
- Ajustar `useFichaKeyboardNav`/`fichaNav.ts` só se os novos botões entrarem indevidamente na ordem de foco.
