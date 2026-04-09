

## Implementar edição de modelos salvos com Hook dedicado

### Problema atual

O carregamento de templates usa `navigate` + `window.location.reload()`, reinicializando os `useState` via `df`. Para edição in-place (sem reload), precisamos de um mecanismo que popule os ~50 campos do formulário diretamente via setters.

### Parte 1 — Criar `src/hooks/useTemplateManagement.ts`

Hook que encapsula toda a lógica de CRUD de templates:

- **Estado**: `editingTemplateId`, `templates`, `templateName`, `templateSearch`, `showTemplates`
- **`loadTemplates(userId)`**: busca templates do usuário
- **`saveTemplate(userId, formData)`**: INSERT quando `editingTemplateId` é null
- **`updateTemplate(formData)`**: UPDATE quando `editingTemplateId` existe, usando `.eq('id', editingTemplateId)`
- **`deleteTemplate(id)`**: DELETE + reload
- **`startEditing(template)`**: seta `editingTemplateId` e `templateName`, retorna `form_data` para o componente popular os campos
- **`cancelEditing()`**: limpa `editingTemplateId` e `templateName`
- **`isEditing`**: computed boolean

### Parte 2 — Função `populateFormFromTemplate` no OrderPage

Criar uma função que recebe um `Record<string, string>` (form_data) e chama todos os setters (~50 campos). Essa função será usada tanto pelo `handleUseTemplate` (eliminando o `window.location.reload()`) quanto pelo `startEditing`.

```typescript
const populateFormFromTemplate = (fd: Record<string, string>) => {
  setModelo(fd.modelo || '');
  setSolado(fd.solado || '');
  setFormatoBico(fd.formatoBico || '');
  // ... todos os ~50 campos
};
```

### Parte 3 — Alterações na UI do OrderPage

**Dialog de modelos (linha ~1226-1231)**:
- Adicionar botão `Pencil` entre "Preencher" e "Excluir"
- Ao clicar: chama `startEditing(template)`, depois `populateFormFromTemplate(template.form_data)`, seta `mode = 'template'`, fecha dialog

**Cabeçalho (linha ~855)**:
- Quando `isEditing`: título "Editar Modelo" em vez de "Criar Modelo"
- Botão "Voltar" também chama `cancelEditing()`

**Botão submit (linha ~1199-1202)**:
- Quando `isEditing`: texto "SALVAR ALTERAÇÕES NO MODELO", ícone `Check`
- Form onSubmit: `isEditing ? handleUpdateTemplate() : handleSaveTemplate()`

**Campo nome do modelo (linha ~876)**:
- Mostrar também quando `isEditing` (já editável com valor pré-preenchido)

### Parte 4 — Segurança

A policy RLS `Users can update own templates` já existe com `USING (auth.uid() = user_id)`. Nenhuma migração necessária.

### Parte 5 — Fluxo completo

1. Usuário abre dialog "Modelos Salvos"
2. Clica no lápis → form preenchido, modo edição ativo, dialog fecha
3. Altera campos desejados
4. Clica "SALVAR ALTERAÇÕES NO MODELO" → UPDATE no Supabase
5. `toast.success("Modelo atualizado com sucesso!")` → reset para modo `order`

### Resumo de arquivos

| Arquivo | Ação |
|---------|------|
| `src/hooks/useTemplateManagement.ts` | Novo — hook com CRUD de templates |
| `src/pages/OrderPage.tsx` | Usar hook, adicionar `populateFormFromTemplate`, UI de edição |

