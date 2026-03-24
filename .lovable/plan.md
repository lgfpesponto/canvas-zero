

## Corrigir pedidos 60335 e 60336 + garantir deploy

### Problema
Os pedidos 60335 e 60336 foram criados com `user_id` da Fernanda ao invés do Samuel. Isso acontece porque a Fernanda está usando a versão publicada do site (`portal7estrivos.lovable.app`) que ainda não tem o código atualizado.

O código-fonte já está correto — mas o build publicado pode não estar atualizado.

### Ações

#### 1. Migração de dados — corrigir pedidos 60335 e 60336
Executar novamente o UPDATE para reatribuir todos os pedidos com `vendedor` diferente do `user_id`:

```sql
UPDATE orders o
SET user_id = p.id
FROM profiles p
WHERE o.vendedor = p.nome_completo
  AND o.user_id != p.id;
```

#### 2. Republicar o site
Após a migração, republicar o projeto para garantir que a versão publicada (`portal7estrivos.lovable.app`) tenha o código com a lógica de atribuição correta. Isso fará com que **todos os próximos pedidos** já entrem corretamente.

### Resultado
- Pedidos 60335 e 60336 serão reatribuídos ao Samuel imediatamente
- Qualquer outro pedido com mismatch também será corrigido
- Após republicar, novos pedidos criados por admin com outro vendedor irão automaticamente para o portal do vendedor correto

