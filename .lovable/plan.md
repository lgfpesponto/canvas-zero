Vou ajustar somente a organização visual da tela de editar pedido para espelhar a ficha atual de criação.

Plano:
1. Em `EditOrderPage.tsx`, reorganizar os campos internos das seções para bater com `OrderPage.tsx`.
2. Remover campos duplicados/soltos que ficaram fora das seções, principalmente:
   - `Sob Medida` duplicado fora de Identificação
   - `Acessórios` solto antes de Couros
   - `Desenvolvimento` solto antes de Bordado
   - `Nome Bordado` solto fora de Bordado
   - `Estampa` solta fora da seção Estampa
   - `Observação` solta no final
3. Fazer a ordem da edição seguir a ficha atual:
   - Identificação: foto, vendedor/número, tamanho/gênero/modelo, sob medida, observação
   - Couros
   - Pesponto
   - Solado
   - Bordado: desenvolvimento, bordados, cores, nome bordado
   - Laser e Recortes
   - Estampa
   - Metais
   - Extras: acessórios, tricê, tiras e carimbo a fogo no mesmo bloco, como na ficha atual
   - Adicional
4. Corrigir diferenças internas importantes:
   - Título `Solados` para `Solado`
   - Pesponto respeitar a mesma regra de ocultar Borrachinha/Vivo quando o modelo exige
   - Metais usar a mesma estrutura visual de cards da ficha atual, sem alterar cálculo
5. Não alterar preços, regras de opções, salvamento, permissões, PDFs ou banco de dados.