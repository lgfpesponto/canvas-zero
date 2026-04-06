

## Ajustes no monitoramento de armazenamento

### 1. Edge Function `cleanup-old-orders`

**Filtro de status:** Mudar de `["Entregue", "Cobrado", "Pago"]` para apenas `["Pago"]`.

**Campos adicionais a limpar:** Além dos já limpos, adicionar `numero`, `modelo`, `tamanho`, `numero_pedido_bota` ao update (setando como `''` ou `null`). Também limpar todos os outros campos de detalhes que sobravam (solado, formato_bico, cor_vira, couros, cores, bordados, metais, acessorios, etc.) — basicamente zerar tudo exceto `id`, `vendedor`, `quantidade`, `preco`, `data_criacao`, `status`, `user_id`, `cliente`, `tipo_extra`.

### 2. Texto de confirmação no `Index.tsx`

Atualizar a mensagem do `AlertDialogDescription` para refletir:
- Somente pedidos com status **"Pago"** há mais de 90 dias
- Apenas **vendedor, quantidade e valor** serão mantidos

### 3. Reposicionar card de armazenamento

Mover o bloco do card de armazenamento (linhas 499-559) para **depois** do bloco de relatórios especializados (depois da linha 566), ficando abaixo dos relatórios no dashboard da Juliana.

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `supabase/functions/cleanup-old-orders/index.ts` | Filtro só "Pago", limpar mais campos (numero, modelo, etc.) |
| `src/pages/Index.tsx` | Texto atualizado + card movido para baixo dos relatórios |

