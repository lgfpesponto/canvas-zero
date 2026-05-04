## Foto aberta por padrão na visão de pedido detalhado (todos os portais)

Aplicar a mesma mudança em **todas as telas de visualização detalhada** que possuem o botão de foto.

### Arquivos afetados

1. `src/pages/OrderDetailPage.tsx` (admin / vendedores)
2. `src/components/BordadoOrderView.tsx` (portal bordado)

> Telas de criação/edição (`OrderPage.tsx`, `BeltOrderPage.tsx`, `EditOrderPage.tsx`, etc.) não fazem parte — o pedido é "visão detalhada" só nas duas acima.

### Mudanças (idênticas em cada arquivo)

**A. Estado inicial** — começa aberto:
```tsx
const [fotoOpen, setFotoOpen] = useState(true);
```
O `showFotoPanel` continua exigindo `fotoUrlAtual`, então pedidos sem foto não mostram nada.

**B. Botão vira toggle** com texto dinâmico:
```tsx
<button
  type="button"
  onClick={() => setFotoOpen(o => !o)}
  className="..."
>
  <ImageIcon className="h-4 w-4" />
  {fotoOpen
    ? 'Recolher foto'
    : (fotosValidas.length > 1 ? `Ver fotos (${fotosValidas.length})` : 'Ver foto')}
</button>
```

No `BordadoOrderView.tsx` há **dois botões** (linhas 242 e 302) que abrem a foto — ambos viram toggles com o mesmo padrão. O `onClose` do `FotoPedidoSidePanel` continua chamando `setFotoOpen(false)` para fechar pelo X.
