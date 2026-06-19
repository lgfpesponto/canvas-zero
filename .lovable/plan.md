## Mostrar Palmilha na Composição do Pedido

Adicionar Palmilha em dois pontos (mesmo padrão de Revitalizador):

### 1. `src/pages/OrderDetailPage.tsx`
- **Bloco subtotal extras** (linha ~461): adicionar
  ```ts
  case 'palmilha': { const qty = parseInt(det.quantidade) || 1; t += 10 * qty; break; }
  ```
- **Bloco extraPriceItems** (linha ~880): adicionar
  ```ts
  case 'palmilha': {
    const qty = parseInt(det.quantidade) || 1;
    extraPriceItems.push([`Palmilha${qty > 1 ? ` (${qty}x)` : ''}`, 10 * qty]);
    break;
  }
  ```
  (Sufixo `(Nx)` só quando quantidade > 1, conforme pedido.)

### 2. `src/lib/recomputeOrderPrice.ts`
- Linha ~132: adicionar
  ```ts
  case 'palmilha': { const qty = parseInt(det.quantidade) || 1; t += 10 * qty; break; }
  ```

Sem mudanças no banco. Pedidos já criados de palmilha passam a mostrar a linha automaticamente.
