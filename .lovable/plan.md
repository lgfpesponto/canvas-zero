

## Bota Pronta Entrega — múltiplas botas no mesmo pedido

### O que muda

O formulário de "Bota Pronta Entrega" passa a suportar múltiplas botas no mesmo pedido:
- Campo "N° do pedido" → "N° do pedido (mesmo do site)"
- Campo "Descrição do produto" → "Descrição da bota" (obrigatório: nome + tamanho)
- Campo "Valor" → "Valor da bota"
- Abaixo da quantidade, botão "+ 1 bota" que adiciona novas linhas (Descrição da bota N, Valor da bota N, Quantidade)
- Cada bota tem valor e quantidade individual
- O valor total do pedido soma todos os itens
- Itens podem ser removidos (exceto o primeiro)

### Alterações em `src/pages/ExtrasPage.tsx`

#### 1. Estado para lista de botas
Ao abrir o modal de `bota_pronta_entrega`, iniciar com um array de botas:
```typescript
// No form ou estado separado:
const [botasPE, setBotasPE] = useState([{ descricao: '', valor: '', quantidade: '1' }]);
```
Resetar no `openModal` quando `productId === 'bota_pronta_entrega'`.

#### 2. Formulário com lista dinâmica
Substituir o bloco `{productId === 'bota_pronta_entrega' && (...)}` (~linhas 565-579):
- Para cada item do array `botasPE`, renderizar:
  - Label "Descrição da bota {N}" (N > 1 mostra número)
  - Textarea obrigatório (placeholder: "Nome do produto + tamanho")
  - Label "Valor da bota {N} (R$)"
  - Input number
  - Label "Quantidade"
  - Input number (editável, min 1)
  - Botão remover (X) se N > 1
- Após o último item, botão "+ 1 bota" que adiciona `{ descricao: '', valor: '', quantidade: '1' }` ao array

#### 3. Cálculo de preço
Em `calcPrice` (~linha 128), para `bota_pronta_entrega`:
```typescript
case 'bota_pronta_entrega':
  return botasPE.reduce((sum, b) => sum + (parseFloat(b.valor) || 0) * (parseInt(b.quantidade) || 1), 0);
```

#### 4. Validação no submit
Em `handleSubmit` (~linha 150), validar que todas as botas têm descrição e valor > 0.

#### 5. Dados salvos no extraDetalhes
Salvar a lista de botas no `extraDetalhes`:
```typescript
detalhes = { 
  botas: botasPE.map(b => ({ 
    descricaoProduto: b.descricao, 
    valorManual: b.valor, 
    quantidade: b.quantidade 
  }))
};
```
Manter compatibilidade: se só 1 bota, também salvar `descricaoProduto` e `valorManual` no nível raiz do detalhes.

#### 6. Label do campo N° pedido
Trocar "N° do pedido" para "N° do pedido (mesmo do site)" apenas quando `productId === 'bota_pronta_entrega'`.

### Ajustes de compatibilidade

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/ExtrasPage.tsx` | Formulário multi-bota, cálculo, validação, submit |
| `src/pages/OrderDetailPage.tsx` | Exibir lista de botas do `extraDetalhes.botas` na visualização |
| `src/pages/EditExtrasPage.tsx` | Suportar edição da lista de botas |
| `src/components/SpecializedReports.tsx` | PDF: listar cada bota individual com valor e quantidade |

