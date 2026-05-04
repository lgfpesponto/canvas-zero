## Objetivo

Adicionar no relatório **"Comissão Bordado"** (admin_master, em `/relatorios`) um filtro multi-seleção **"Quem deu baixa"** que permite escolher um ou mais usuários (Mariana ADM, Débora, Neto). Vazio = todos. Isso resolve o problema da Mariana baixar pedidos antigos sem misturar com a comissão do dia da Débora/Neto.

## Como funciona

- **Sem filtro selecionado** → comportamento atual (todas as baixas no período).
- **Com 1+ usuário selecionado** → o PDF mostra só as baixas onde `historico[].usuario` está na seleção.
- O subtítulo do PDF passa a indicar quem foi filtrado (ex: "Filtrado por: Débora, Neto").

## Onde

### 1) `src/components/SpecializedReports.tsx`

- Novo state `filterBordadoUsuarios: Set<string>` + `bordadoUsuariosOptions: string[]`.
- `useEffect` ao selecionar o relatório `comissao_bordado` carrega dinamicamente os usuários distintos que já aparecem no histórico em `local = 'Baixa Bordado 7Estrivos'` (uma única consulta a `orders`, deduplicação no front). Fallback fixo `['Mariana ADM', 'Debora', 'Neto']` se a consulta vier vazia.
- `resetFilters()` zera o novo set.
- Novo bloco de UI (Popover + Checkbox, padrão idêntico ao de "Progresso de Produção") visível **apenas** quando `activeReport === 'comissao_bordado'`. Botões "Todos" e "Nenhum".
- `generateComissaoBordadoPDF` passa o array de usuários filtrados para `generateBordadoBaixaResumoPDF`.

### 2) `src/lib/pdfGenerators.ts`

- `generateBordadoBaixaResumoPDF` ganha **novo parâmetro opcional** `usuariosFiltro?: string[]`:
  - Quando vazio/undefined → comportamento atual.
  - Quando preenchido → filtro extra dentro de `baixasValidas`: aceita só `h.usuario` que esteja no array.
  - O `periodoLabel` no cabeçalho do PDF ganha sufixo `" • Filtrado por: <nomes>"`.
  - O nome do arquivo ganha sufixo (ex: `Comissao-Bordado-2026-05-04_Mariana-ADM.pdf`) quando há filtro.

## O que NÃO muda

- RPC, RLS, dados, comissão padrão, lógica de dia útil, exclusão de Cancelado: tudo intacto.
- Outros relatórios: zero impacto (state e UI são exclusivos do `comissao_bordado`).
- Portal Bordado (`BordadoPortalPage.tsx`): não muda. A baixa continua registrando o `usuario` no histórico igual já faz hoje (a função RPC `bordado_baixar_pedido` já usa `current_user_nome_completo()`).

## Resultado prático

- Você gera 2 PDFs: um filtrando "Débora + Neto" (comissão real do dia) e outro filtrando "Mariana ADM" (baixas administrativas dos dias anteriores).
- Os relatórios saem separados e não se misturam.

## Arquivos afetados

```
src/components/SpecializedReports.tsx   (state + UI + carregamento da lista de usuários)
src/lib/pdfGenerators.ts                (parâmetro novo + filtro + label)
```

Confirmando, eu implemento.