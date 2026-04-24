

## Adicionar indicador de carregamento na busca de pedido

### Problema

Quando você bipa um código de barras ou pesquisa um pedido, a função `fetchOrderByScan` em `src/hooks/useOrders.ts` faz várias consultas em sequência ao Supabase (numero → UUID → hex suffix → legacy barcode). Isso pode levar 1-3 segundos e durante esse tempo a UI não dá nenhum feedback, parecendo travada.

### Investigação necessária

Preciso identificar **onde** a busca é disparada para colocar o spinner no lugar certo. Os candidatos prováveis são:

1. **Header** (busca global/scanner) — `src/components/Header.tsx`
2. **TrackOrderPage / ReportsPage** — campo de busca no topo
3. **Algum componente de scanner** dedicado

Vou ler esses arquivos pra confirmar onde `fetchOrderByScan` é chamado e como o resultado é tratado hoje.

### Solução proposta (sujeito a ajuste após investigação)

**1. Estado de loading local** no componente que dispara a busca:

```tsx
const [scanning, setScanning] = useState(false);

const handleScan = async (code: string) => {
  setScanning(true);
  try {
    const order = await fetchOrderByScan(code);
    if (order) navigate(`/pedido/${order.id}`);
    else toast.error('Pedido não encontrado');
  } finally {
    setScanning(false);
  }
};
```

**2. Indicador visual** — usar `Loader2` do `lucide-react` com `animate-spin` (padrão já usado no projeto):

- **Overlay modal** (recomendado se a busca bloqueia navegação): card centralizado com spinner + texto "Buscando pedido..."
- **Inline no campo de busca** (se for menos invasivo): spinner pequeno dentro do input substituindo o ícone de lupa

**3. Bloquear novas buscas** enquanto `scanning === true` (evita disparar 2 requests se bipar 2 vezes rápido).

### Arquivos a editar (estimativa)

- `src/components/Header.tsx` (ou onde estiver o scanner) — adicionar estado + UI de loading
- Possivelmente `src/pages/ReportsPage.tsx` se a busca também roda lá

Sem mudanças em hooks, banco ou RLS — só feedback visual.

### O que NÃO mexo

- `fetchOrderByScan` (a lógica de busca em cascata fica igual)
- Performance da query (otimizar isso seria outro plano — exigiria índices ou consolidar em uma RPC)
- Banco / RLS

### Validação (você faz depois)

1. Bipar um pedido → conferir que o spinner aparece imediatamente e some quando o pedido abre
2. Bipar um código inválido → spinner aparece, depois some + toast "não encontrado"
3. Bipar 2 vezes rápido → segunda leitura é ignorada enquanto a primeira processa

### Pergunta antes de começar

Quero confirmar onde a busca acontece pra fazer o spinner no lugar certo. Posso investigar isso agora (ler Header e ReportsPage) e ajustar o plano antes de implementar?

