## Objetivo
1. Mover a página NF-E para dentro de `/admin/configuracoes` como aba (removendo o link "NF-E" do menu superior).
2. Trocar as abas horizontais atuais por um **submenu vertical à esquerda** (estilo sidebar do print de referência).

## Alterações

### `src/components/Header.tsx`
Remover a linha do link NF-E (linha 50):
```ts
...(hasNfeAccess ? [{ label: 'NF-E', path: '/configuracoes/nfe' }] : []),
```
Rota `/configuracoes/nfe` **continua funcionando** (links internos que apontem para ela não quebram).

### `src/pages/AdminConfigPage.tsx`
- Importar `ConfiguracoesNFe` e o hook `useNfeAccess`.
- Trocar layout dos Tabs para vertical:
  - `Tabs orientation="vertical"` dentro de um container `flex gap-6`.
  - `TabsList` vira coluna à esquerda: `flex-col h-auto w-56 bg-primary/90 rounded-lg p-2` (fundo marrom institucional, itens brancos), cada `TabsTrigger` alinhado à esquerda com padding vertical.
  - Área de conteúdo à direita com `flex-1 min-w-0`.
- Adicionar `<TabsTrigger value="nfe">` (ícone `FileText`), visível somente quando `useNfeAccess()` retornar true.
- Adicionar `<TabsContent value="nfe"><ConfiguracoesNFe /></TabsContent>`.

### Estilo do sidebar (aproxima do print)
- Container do menu: fundo `bg-primary` marrom, cantos arredondados, texto `text-primary-foreground`.
- Trigger ativo: fundo `bg-background text-primary` (contraste).
- Divisórias suaves entre itens.
- Em telas < md, cair de volta para lista rolável horizontal (mantém acessibilidade mobile).

## Fora de escopo
- Nenhuma mudança no conteúdo/lógica de NF-E, tributação ou outras abas.
- Rota `/configuracoes/tributacao` continua como página separada acessível via botão dentro de NF-E.