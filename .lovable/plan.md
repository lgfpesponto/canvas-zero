## Liberar página "Modelos" no menu para admin_producao

O acesso à rota `/modelos` já foi liberado antes (ModelosPage.tsx não bloqueia mais admin_producao), mas o link "MODELOS" continua escondido no menu principal para esse perfil.

### Alteração
- `src/components/Header.tsx` linha 39: remover `&& role !== 'admin_producao'` do cálculo de `canSeeModelos`. Fica:
  ```ts
  const canSeeModelos = showAsLogged && role !== 'bordado' && role !== 'montagem';
  ```

Com isso Fernanda e Mariana (admin_producao) passam a ver o item "MODELOS" no header e conseguem navegar direto para a página, com a mesma visualização já disponível (todos os modelos cadastrados, sem botões de compra/gerar pedido, conforme regra atual).

### Fora de escopo
- Não altera permissões de compra/geração de pedido em `/modelos`.
- Não filtra a lista por autor — continua mostrando todos os modelos.
