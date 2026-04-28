## Problema

Pedidos como 43328, 43301 e 43330 mantêm bordados antigos ("Ramos", "Cruz Bordada") na composição mesmo após edição que aparentemente os "desmarcou". 

**Causa raiz** (confirmada no DB e no código de `EditOrderPage.tsx`):

1. Ao abrir o pedido, o estado é inicializado com `bordadoCano = ['Ramos']` (vindo do registro antigo).
2. "Ramos" foi removido do catálogo (`mergedBordadoCano` não contém mais esse item).
3. Como o `MultiSelect` só renderiza checkboxes para itens que **estão no catálogo atual**, o item "Ramos" fica invisível na UI — o usuário acha que está desmarcado, mas continua no array de estado.
4. Ao adicionar "Ramos Lara" e salvar, o array vira `['Ramos', 'Ramos Lara']` → DB grava `"Ramos, Ramos Lara"` e a soma da composição inclui ambos.

Histórico do 43330 confirma exatamente isso: `Alterado Bordado Cano de "Cruz Bordada" para "Cruz Bordada, Cruz Bridão"`.

## Solução

Aplicar **filtragem ao abrir o pedido para edição**: qualquer item selecionado que não exista mais no catálogo atual é automaticamente desmarcado, e um toast avisa o usuário.

### Mudanças em `src/pages/EditOrderPage.tsx`

1. **No `useEffect` de inicialização (linhas 203-260)**, após carregar os arrays de bordados/lasers/acessórios, filtrar contra o catálogo atual:

```ts
// Helpers para validar contra catálogo atual
const validLabels = (cat: string, fallback: {label:string;preco:number}[]) =>
  new Set(getDbItems(cat, fallback).map(i => i.label));
const validLaserLabels = (cat: string) =>
  new Set(getLaserItems(cat).map(i => i.label));

const removidos: string[] = [];
const filterAndTrack = (arr: string[], valid: Set<string>, campo: string) => {
  const kept: string[] = [];
  arr.forEach(v => {
    if (valid.has(v)) kept.push(v);
    else removidos.push(`${campo}: "${v}"`);
  });
  return kept;
};

const bc = filterAndTrack(
  order.bordadoCano?.split(', ').filter(Boolean) ?? [],
  validLabels('bordado_cano', BORDADOS_CANO),
  'Bordado Cano'
);
// ... mesmo para bordadoGaspea, bordadoTaloneira, laserCano, laserGaspea, laserTaloneira, acessorios
setBordadoCano(bc);

if (removidos.length > 0) {
  toast.warning(
    `${removidos.length} item(ns) foram desmarcados pois não existem mais no catálogo: ${removidos.join('; ')}. Revise a composição antes de salvar.`,
    { duration: 8000 }
  );
}
```

2. **Categorias afetadas** (todas que usam `MultiSelect` contra catálogo dinâmico):
   - `bordadoCano` / `bordadoGaspea` / `bordadoTaloneira`
   - `laserCano` / `laserGaspea` / `laserTaloneira`
   - `acessorios` (validar contra `ACESSORIOS` hardcoded — só remove se o item nem está no fallback)

3. **Ordenação do `useEffect`**: as funções `getDbItems` / `getLaserItems` dependem do contexto `useCustomOptions` / `useFichaVariacoes`. Garantir que o `useEffect` só filtre quando esses dados já carregaram (adicionar dependências `customOptions`, `fichaVariacoes` ou esperar o primeiro render com dados).

4. **Sem mudanças** em `handleSave`, `updateOrder` ou no schema — o problema já se resolve antes do salvar, e o histórico de alterações vai registrar corretamente "Removido Bordado Cano" para os itens órfãos.

### Não afeta

- Pedidos que não têm itens órfãos: comportamento idêntico.
- Pedidos já salvos no DB com itens órfãos: ao próxima edição, serão limpos (e o usuário pode salvar para consolidar). O total **da listagem** continua mostrando o valor salvo até a próxima edição — isso é o comportamento esperado (não mexer em dados sem ação humana).

## Resultado esperado

- Ao abrir 43328 / 43301 / 43330 hoje: toast avisa "Ramos" / "Cruz Bordada" foram desmarcados; usuário confirma a composição correta e salva; DB passa a refletir só o que está selecionado.
- Pedidos futuros: impossível salvar item que não existe no catálogo.
