## Regra "Solado Rústica"

Aplicar em todos os pontos do bloco Tradicional onde "Rústica" for o solado:

### 1. `src/lib/orderFieldsConfig.ts`

- **`getBicosForModeloSolado`** (case `'tradicional'`): se `solado === 'Rústica'` → retornar apenas `['Quadrado']` (atualmente devolve `['Quadrado', 'Redondo']`).
- **`getCorSolaOptions`** (case `'tradicional'`): mudar `solado === 'Rústica'` para retornar `null` em vez de `[Madeira]` — assim a UI esconde o campo (mesmo padrão do Jump/Infantil).
- **`getCorViraOptions`**: ajustar a assinatura para permitir `null` e, no case `'tradicional'`, retornar `null` quando `solado === 'Rústica'`. Atualizar consumidores que tratam o retorno (DynamicOrderPage e qualquer lookup) para esconder o campo quando vier `null`, igual já é feito para Cor da Sola.

### 2. `src/lib/pdfGenerators.ts` (canhotos + ficha)

Dentro do bloco SOLADOS (linhas ~360-366) e na geração dos canhotos compactos (linhas ~587-594), envolver as linhas de Cor Sola e Cor Vira em `if (order.solado !== 'Rústica')`:
- Ficha: não adicionar `Cor:` nem `Vira:` quando solado for Rústica.
- Canhoto compacto: `line2` sem `abbrevCorSola`; `viraText` vazio. Mantém apenas tamanho + solado + bico.

### 3. `src/lib/cobrancaPdf.ts` (composição de preços)

Linhas 258-261: pular as entradas `Cor Sola` e `Cor Vira` quando `o.solado === 'Rústica'` (já não somariam preço, mas garante que não apareçam na lista).

### 4. Regra de migração

Pedidos antigos com solado "Rústica" que já tenham `corSola`/`corVira` preenchidos: deixar o dado no banco (sem deletar — política de preservação) mas a exibição em formulário/PDF/composição passa a ignorar esses campos automaticamente pelas regras acima.

### 5. Atualizar `docs/BUSINESS_RULES.md`

Na seção **C. Bloco TRADICIONAL**, alterar as linhas referentes a Rústica:
- "Cor Sola (Rústica)" → *campo oculto (retorna null)*
- "Cor Vira (Rústica)" → *campo oculto (retorna null)*
- Acrescentar nota no Bico: "Se solado = Rústica → apenas Quadrado".

### Fora de escopo
Sem mudanças em RLS, tabelas, edge functions, NF-e, ou outros blocos (Infantil/City/BicoFinoFeminino/Perfilado).