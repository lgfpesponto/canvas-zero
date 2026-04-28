## Problema

No "Histórico de Alterações" do detalhe do pedido, cada campo alterado vira uma linha separada — mesmo quando todas as mudanças foram salvas no mesmo clique em Salvar. O exemplo mostra 4 linhas separadas no mesmo timestamp 17:46/17:47.

## Solução

Agrupar as alterações pelo "evento de salvamento" usando a chave **(data + hora + usuário)** — que é exatamente como o `updateOrder` em `AuthContext.tsx` já registra (todas as mudanças de um único `handleSave` recebem o mesmo `dataHoje`/`horaAgora`/`usuarioAtual`). Sem necessidade de migração de dados.

### Mudanças em `src/pages/OrderDetailPage.tsx`

**1. Após `const alteracoes = order.alteracoes || [];` (linha 333)**, adicionar:

```ts
const alteracoesAgrupadas = (() => {
  const groups: { data: string; hora: string; usuario?: string; descricoes: string[] }[] = [];
  for (const a of alteracoes) {
    const last = groups[groups.length - 1];
    if (last && last.data === a.data && last.hora === a.hora && (last.usuario || '') === (a.usuario || '')) {
      last.descricoes.push(a.descricao);
    } else {
      groups.push({ data: a.data, hora: a.hora, usuario: a.usuario, descricoes: [a.descricao] });
    }
  }
  return groups;
})();
```

**2. Substituir o `.map` do bloco de Histórico de Alterações (linhas 549-556)** para renderizar grupos:

```tsx
<div className="space-y-3 max-h-80 overflow-y-auto">
  {alteracoesAgrupadas.map((g, i) => (
    <div key={i} className="border-b border-border/30 pb-2">
      <p className="text-xs text-muted-foreground">
        {formatDateBR(g.data)} às {g.hora} — por {g.usuario || '—'}
        {g.descricoes.length > 1 && (
          <span className="ml-1 text-muted-foreground/70">({g.descricoes.length} alterações)</span>
        )}
      </p>
      {g.descricoes.length === 1 ? (
        <p className="text-sm">{g.descricoes[0]}</p>
      ) : (
        <ul className="text-sm list-disc pl-5 mt-0.5 space-y-0.5">
          {g.descricoes.map((d, j) => <li key={j}>{d}</li>)}
        </ul>
      )}
    </div>
  ))}
</div>
```

### Resultado

O exemplo da imagem (4 linhas em 17:46/17:47) passará a aparecer como **2 grupos**:

```
28/04/2026 às 17:46 — por stefany ribeiro feliciano  (3 alterações)
  • Alterado Bordado Cano de "Ramos" para "Ramos, Ramos Lara"
  • Alterado Bordado Gáspea de "..." para "..."
  • Alterado Valor total de "360" para "410"

28/04/2026 às 17:47 — por stefany ribeiro feliciano  (2 alterações)
  • Alterado Valor total de "410" para "395"
  • Alterado Bordado Gáspea de "..." para "Ramos Lara"
```

### Notas

- Funciona com dados existentes sem migração — a chave de agrupamento usa o que já está salvo no JSONB.
- Alterações isoladas (1 só campo no clique) continuam aparecendo como antes (sem bullets, sem contador).
- Nenhuma mudança em `AuthContext.updateOrder` ou no banco.
