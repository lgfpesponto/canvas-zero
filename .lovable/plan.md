## Objetivo
1. Garantir que **bota, cinto e extras** mostrem **exatamente a mesma lista** de cores por tipo de couro.
2. Impedir que o navegador traduza nomes próprios (Crazy Horse, Floter, Nobuck etc.).

---

## Parte A — Unificar lista de cores em todas as fichas

### Regra canônica (vale para bota, cinto e extras)

**Tipos com lista FECHADA:**
- Vaca Holandesa → Malhado, Preto, Branco
- Vaca Pintada → Caramelo, Preto e Branco
- Metalizado → Rosa Neon
- Estilizado em Madeira → Mostarda

**Cores restritas (só aparecem para tipos específicos):**
- Nescau → Crazy Horse, Escamado
- **Nescau Chapado → Crazy Horse** *(passa a aparecer também no cinto/extras — já aparecia)*
- Chocolate → Nobuck, Estilizado em Tilápia
- Marrom → Látego, Estilizado em Cobra, Estilizado em Jacaré, Estilizado em Avestruz, Estilizado em Dinossauro, Estilizado em Tatu

**Demais tipos** (Crazy Horse, Látego, Fóssil, Napa Flay, **Floter**, Nobuck, Egípcio, Estilizados em Arraia/Tilápia/Cobra/Jacaré/Avestruz/Dinossauro/Tatu, Aramado, Escamado, Estilizado Duplo): recebem a **lista geral** = todas as cores de `CORES_COURO` **menos** as restritas que não pertencem a ele e **menos** as exclusivas de outros tipos (com exceção de Preto, que é universal).

→ Floter passará a mostrar **Branco** no cinto (hoje não aparece porque a função hardcoded está removendo cores exclusivas demais).

### Mudanças de código

**1. `src/lib/orderFieldsConfig.ts`** — corrigir `getCoresCouroFiltradas` para devolver a lista correta. Causa do bug do "Branco no cinto com Floter": hoje a função remove cores exclusivas de outros tipos da lista geral (linha 97–98), o que está retirando Branco. A correção é **não remover Branco/Preto** (universais) e manter apenas a exclusão do que realmente é exclusivo (Malhado, Caramelo, Preto e Branco, Rosa Neon).

**2. `src/hooks/useDynamicFieldFilter.ts`** — quando o banco devolver uma lista, **mesclar** com a regra hardcoded em vez de substituir cegamente:
- Aplicar a interseção apenas quando faz sentido; se o banco lista cores para um tipo, completar com as cores restritas do hardcoded (Nescau Chapado para Crazy Horse, por exemplo).
- Alternativa mais simples e robusta: **ignorar o filtro do banco para cor↔couro** e usar sempre o hardcoded unificado em todas as fichas. Isso elimina a divergência entre bota e cinto definitivamente.
- **Vou seguir a alternativa simples**: remover a chamada a `getFilteredOptions` no `getDynCoresCouro` de `OrderPage.tsx` e `EditOrderPage.tsx` e usar somente `getCoresCouroFiltradas`. O `useDynamicFieldFilter` continua existindo para outros campos dinâmicos.

**3. Migration no banco** — atualizar `ficha_variacoes.relacionamento` para Crazy Horse incluir "Nescau Chapado" nas três regiões (cano/gáspea/taloneira). Mesmo que o frontend não use mais isso para cor, manter o banco coerente evita confusão futura no editor de variações do admin.

**4. `src/pages/ExtrasPage.tsx`** (linha 783) — trocar o `CORES_COURO` cru pelo `getCoresCouroFiltradas(extra.dados.tipoCouro)` para o extra também respeitar o filtro.

**5. `src/pages/EditExtrasPage.tsx`** — aplicar o mesmo padrão.

`BeltOrderPage` e `EditBeltPage` já usam `getCoresCouroFiltradas`, só ganham automaticamente a correção do passo 1.

---

## Parte B — Desativar tradução automática do navegador

**1. `index.html`**
- Adicionar `<meta name="google" content="notranslate">` no `<head>`.
- Adicionar `translate="no"` e `class="notranslate"` na tag `<html>`.

Isso já cobre Chrome/Edge/Safari/Firefox e impede que "Crazy Horse" vire "Cavalo Louco" em qualquer tela do portal.

---

## Resultado esperado
- Bota, cinto e extras com Crazy Horse mostram: lista geral + Nescau + **Nescau Chapado**.
- Bota, cinto e extras com Floter mostram: lista geral incluindo **Branco**.
- Vaca Holandesa, Vaca Pintada, Metalizado e Estilizado em Madeira mantêm listas fechadas iguais nas três fichas.
- Nenhum texto da interface é traduzido pelo navegador.

## Memória
Vou registrar em `mem://features/orders/couro-color-rules` a regra canônica para que futuras alterações respeitem essa fonte única.
