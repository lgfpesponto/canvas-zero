## Corrigir filtro de modelos completos em `/modelos`

### Problema

A filtragem em `ModelosPage.tsx` procura o gênero em `form_data.genero`, mas na tabela `order_templates` o `genero` é uma **coluna própria** (top-level), não uma chave dentro de `form_data`. Resultado: 0 modelos passam no filtro, mesmo havendo rascunhos com foto e gênero corretamente preenchidos (confirmado no banco: 8 modelos completos hoje).

Além disso, o `.select(...)` da query nem inclui a coluna `genero`, então o campo chega sempre `undefined` no cliente.

### Correção (arquivo único: `src/pages/ModelosPage.tsx`)

1. Incluir `genero` no `.select(...)` que carrega os templates.
2. Adicionar `genero: string | null` no tipo `ModeloTemplate`.
3. Trocar a checagem do filtro para usar a coluna top-level:
   ```ts
   const foto = (r.foto_url ?? '').toString().trim();
   const genero = (r.genero ?? '').toString().trim();
   return !!foto && !!genero;
   ```
4. Fallback de compatibilidade: se algum registro antigo tiver o gênero só dentro de `form_data.genero`, aceitar também — evita esconder modelos que porventura foram salvos assim antes do campo virar coluna:
   ```ts
   const generoFallback = ((r.form_data ?? {}).genero ?? '').toString().trim();
   return !!foto && !!(genero || generoFallback);
   ```

### Fora de escopo

Não muda criação/edição de modelos, nem o schema do banco, nem outras páginas. Comportamento silencioso, como antes.
