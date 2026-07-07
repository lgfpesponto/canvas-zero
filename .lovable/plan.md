## Objetivo

Alinhar a ordem das seções da tela **Editar Pedido** (`src/pages/EditOrderPage.tsx`) com a ordem atual do **Faça seu pedido** (`src/pages/OrderPage.tsx`), que já foi atualizada.

## Comparação

Ordem atual do Novo Pedido (correta):
1. Identificação
2. Couros
3. Pesponto
4. Solado
5. Bordado
6. Laser e Recortes
7. Estampa
8. Metais
9. Extras
10. Adicional

Ordem atual do Editar (desalinhada):
1. Identificação
2. Couros
3. Bordados
4. Laser e Recortes
5. Pesponto
6. Metais
7. Extras
8. Solados
9. Carimbo a Fogo
10. Adicional

## Mudança

Em `src/pages/EditOrderPage.tsx`, mover os blocos `<Section title="…">` (com todo o conteúdo interno intacto) para esta ordem:

1. Identificação
2. Couros
3. Pesponto
4. Solados
5. Bordados
6. Laser e Recortes
7. Metais
8. Extras
9. Carimbo a Fogo
10. Adicional

Observações:
- Nada de renomear seções, nem mover campos entre seções.
- A tela Editar não possui um bloco separado "Estampa" (o toggle Estampa vive dentro de outra seção da tela) e mantém a seção "Carimbo a Fogo" que o Novo Pedido não tem — ambos permanecem como estão hoje, apenas o Solado sobe para o mesmo lugar do fluxo novo, e Bordados/Laser passam a vir depois do Solado.

## Fora do escopo

- Nenhuma mudança de lógica de campos, preços, validações, submit ou de qualquer outra tela/PDF. Apenas reordenar as `<Section>` do Editar.
