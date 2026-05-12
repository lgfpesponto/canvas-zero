## Problema

O dialog de envio de comprovante (`EnviarComprovanteDialog`) já é o mesmo usado pelo admin e pelo vendedor (na página `/financeiro/saldo` → "Comprovantes"), e já aceita imagens + PDF + extração via IA (`extract-comprovante`).

O motivo de não funcionar para o vendedor é que **o bucket `financeiro` do Storage só tem políticas de INSERT/SELECT para `admin_master`**. Quando o vendedor clica "Enviar", o `uploadComprovanteRevendedor` falha em `storage.objects` antes mesmo de gravar o comprovante — e o erro hoje aparece só como "Erro" no card, sem toast claro.

## O que fazer

### 1. Storage: liberar a pasta `revendedor-saldo/` do bucket `financeiro` para vendedores

Migration adicionando policies em `storage.objects` (bucket `financeiro`, prefixo `revendedor-saldo/`):

- **INSERT**: usuário autenticado pode subir arquivo seu nessa pasta.
- **SELECT**: usuário autenticado pode ver os arquivos que ele mesmo subiu (`owner = auth.uid()`); admins continuam vendo tudo via policy existente.

As policies de admin_master existentes continuam intactas (cobrem a aprovação/visualização pelo admin).

### 2. UX no `EnviarComprovanteDialog`

- Mostrar toast de **sucesso** já existe ("X comprovante(s) enviado(s)!") — manter.
- Adicionar toast de **erro** quando algum item falhar no envio, com a mensagem real (ex.: "Falha ao enviar comprovante.pdf: <motivo>"). Hoje só marca o card como "Erro" silenciosamente.
- Garantir que o erro do upload do Storage seja propagado com mensagem amigável (ex.: "Falha ao subir arquivo — tente novamente").

### 3. Sem mudanças em

- RLS de `revendedor_comprovantes` (já permite vendedor inserir os próprios).
- Edge function `extract-comprovante` (`verify_jwt = false`, já funciona pra qualquer caller).
- Layout / fluxo do dialog.

## Detalhes técnicos

**Migration SQL (resumo):**

```sql
create policy "vendedor insert revendedor-saldo"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'financeiro'
  and (storage.foldername(name))[1] = 'revendedor-saldo'
  and owner = auth.uid()
);

create policy "vendedor select próprios revendedor-saldo"
on storage.objects for select to authenticated
using (
  bucket_id = 'financeiro'
  and (storage.foldername(name))[1] = 'revendedor-saldo'
  and owner = auth.uid()
);
```

**Frontend (`EnviarComprovanteDialog.tsx`):** dentro do `catch` do loop em `handleSendAll`, disparar `toast({ title: 'Falha ao enviar <arquivo>', description: e.message, variant: 'destructive' })` além de marcar o card.