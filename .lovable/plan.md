## Fechar plano anterior + histórico dos extras + auditoria do banco

### 1. Fechar itens pendentes do plano anterior

**`DraftsPage`**: rascunhos locais (`localStorage`) hoje não avisam quando uma variação selecionada foi apagada.
- Detectar tipo do draft a partir do prefixo do id (`draft-belt-*` = cinto, senão bota).
- Usar `useTemplatesValidity(drafts.map(d => ({id: d.id, form_data: d.form})), tipo)` (chamar duas vezes — uma para cada tipo — e mesclar).
- Se inválido: exibir badge vermelho `variação excluída, entre para editar` (tooltip com a lista) e deixar **Continuar** desabilitado. Excluir continua permitido.

### 2. Histórico de edições dos extras

Hoje, `extra_produtos` grava direto (update/delete pelo popover). Não existe versionamento — a aba Extra em Configurações → Ficha de Produção fica vazia.

**Nova tabela `extra_produtos_versoes`** (paralela ao `ficha_versoes` porém dedicada aos extras):

| coluna | descrição |
|---|---|
| id, created_at | padrão |
| versao (int) | numeração sequencial |
| snapshot (jsonb) | array completo de `extra_produtos` no momento |
| descricao_mudanca (text) | preenchido automaticamente (ex.: `Editou "Desmanchar": preço 65→75, +1 variação em qual_sola`) |
| criado_por (uuid) | auth uid |
| ativa (bool) | apenas a última = true |

RLS: leitura para `authenticated`, inserção/update apenas via edge function ou policy `admin_master`. Grants padrão.

**Trigger de auditoria** em `extra_produtos` (AFTER INSERT/UPDATE/DELETE): monta descrição da mudança comparando OLD vs NEW (nome, preco_base, preco_label, chaves de `variacoes` — quantas foram adicionadas/removidas por grupo) e chama `INSERT INTO extra_produtos_versoes` com snapshot atual. Descrição é o resumo humano. Se várias mudanças acontecerem em <30s do mesmo user, faz "coalesce" na última linha (UPDATE em vez de novo INSERT) para não poluir o histórico com um item por tecla.

**Popover de edição**: como o `useUpdateExtraProduto` só faz um `update` de uma vez, cada clique em "salvar" gera 1 entrada nova (coalescida se for salvo em sequência) → histórico legível.

**HistoricoFichasTab.tsx** já tem TabsList por `ficha_tipos`. Adicionar comportamento condicional:
- Quando `activeTipo.slug === 'extra'` → renderizar `<ExtrasHistoricoList />` (lê de `extra_produtos_versoes`) em vez de `<VersoesList fichaTipoId=...>`.
- `ExtrasHistoricoList`: lista versões, mostra descricao_mudanca + autor + data + botão "ver snapshot" (dialog com JSON expandido em tabela nome → preço → nº variações).
- Botão "reverter para esta versão" (admin_master): restaura o array em `extra_produtos` (delete + insert das linhas do snapshot). Confirmação obrigatória.

Tudo aparece na mesma tela **Configurações → Ficha de Produção → Extra**, sem UI nova além da lista.

### 3. Histórico do cinto — verificação

Já funciona. `FichaEditBar` está montado em `BeltOrderPage` e chama `salvarNovaVersao(fichaTipoCintoId, …)` → grava em `ficha_versoes`. A aba **Cinto** dentro de Configurações → Ficha de Produção lista essas versões via `HistoricoFichasTab`. Nenhuma mudança de código necessária — só validar visualmente após a build.

### 4. Auditoria do banco de dados

Rodei consultas em `ficha_categorias/campos/variacoes` cruzando com o formulário do portal. Achados:

**Bota — categorias duplicadas** (mesmo nome, dois `id` diferentes):

| nome | duplicatas | conteúdo |
|---|---|---|
| Solados | ordem 7 (9 vars, 0 campos) e ordem 13 (1 var, 5 campos) | fundir em uma só |
| Acessórios | ordem 4 (0 vars, 1 campo) e ordem 8 (5 vars, 0 campos) | fundir |
| Carimbo a Fogo | ordem 14 (0 vars, 1 campo) e ordem 16 (4 vars, 0 campos) | fundir |
| Desenvolvimento | ordem 6 (0 vars, 1 campo) e ordem 15 (3 vars, 0 campos) | fundir |

Padrão: cada dupla tem uma "categoria-form" (com o campo do formulário) e uma "categoria-catálogo" (com as variações soltas). Isso confunde a aba Configurações porque aparecem duas linhas com o mesmo nome.

**Correção via migration**:
1. Para cada par, escolher o `id` da linha que já tem `campos > 0` como canônico.
2. `UPDATE ficha_variacoes SET categoria_id = <id_canônico> WHERE categoria_id = <id_extra>`.
3. `UPDATE ficha_campos SET categoria_id = <id_canônico>` (se aplicável).
4. `DELETE FROM ficha_categorias WHERE id = <id_extra>` — só quando ficar vazia.

**Cinto — categoria fantasma**:

- `FLOATER` (ordem 1, 0 campos, 0 vars) — provavelmente resíduo de testes. Removida por segurança se realmente não estiver referenciada em nenhum lugar. Confirmado com `SELECT count(*) FROM ficha_campos WHERE categoria_id = '<flOATER_id>'` = 0.

**Extras (tabela `extra_produtos`)**: os 17 produtos seed cobrem exatamente o que o `ExtrasPage.tsx` renderiza (`EXTRA_PRODUCTS`). Cada produto tem `variacoes` JSONB com as chaves esperadas pelo schema (`gravata_country.cor_tira`, `desmanchar.qual_sola`, `adicionar_metais.itens`, etc.). Sem duplicatas nem órfãos.

O `ficha_tipo` "Extra" (slug `extra`, categoria única "Produzindo") pode ser mantido — serve apenas para a aba de histórico via `HistoricoFichasTab` reconhecer o slug e mostrar a lista de `extra_produtos_versoes`. **Não** vamos migrar os produtos extras para dentro de `ficha_categorias/variacoes` — a estrutura JSONB é mais adequada para as variações internas.

### 5. Arquivos

Criados:
- `supabase/migrations/*_extras_versoes_e_cleanup.sql` — cria `extra_produtos_versoes` + trigger de auditoria + limpeza das duplicatas bota + remove FLOATER.
- `src/components/gestao/ExtrasHistoricoList.tsx` — lista + dialog snapshot + reverter.

Alterados:
- `src/components/gestao/HistoricoFichasTab.tsx` — condicional para o slug `extra`.
- `src/pages/DraftsPage.tsx` — badge + block Continuar via `useTemplatesValidity`.

### Compatibilidade

- Pedidos antigos que referenciem categorias duplicadas continuam funcionando (só usamos os `ids` da linha canônica após o UPDATE).
- A trigger de auditoria é `AFTER` e nunca bloqueia a edição.
- O rollback de uma versão de extras é um dry-run: mostra o diff antes de aplicar.