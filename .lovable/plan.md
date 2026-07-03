## Objetivo
Adicionar botão de atalho ao lado do botão "Modelos" em cada página "Faça seu pedido" para alternar rapidamente entre bota e cinto.

## Alterações

### `src/pages/OrderPage.tsx` (rota `/pedido` — bota)
Após o botão "Modelos" (linha ~1556), adicionar:
```tsx
<Button type="button" variant="outline" size="sm" onClick={() => navigate('/pedido-cinto')}>
  Trocar para Cinto
</Button>
```

### `src/pages/BeltOrderPage.tsx` (rota `/pedido-cinto` — cinto)
Após o botão "Modelos" (linha ~615), adicionar:
```tsx
<Button type="button" variant="outline" size="sm" onClick={() => navigate('/pedido')}>
  Trocar para Bota
</Button>
```

Ambos só aparecem no `mode === 'order'` (mesmo bloco de "Criar Modelo" / "Modelos"), respeitando o layout atual.

## Fora de escopo
- Nenhuma alteração de lógica de pedido, formulários ou estado.
- Página `/modelos` permanece igual.