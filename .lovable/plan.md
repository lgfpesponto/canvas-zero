# Correção pontual dos 9 pedidos da Mariana ADM (04/05) + isolamento dos quadros do portal Bordado

Sem mudar nenhuma regra de "baixa válida" no código. A regra atual permanece intacta para todos (Neto, Débora, Mariana, futuros usuários). Apenas:

1. **Correção de dados nesses 9 pedidos** (one-shot via migration).
2. **Filtros de visualização no portal /bordado** (sem alterar regra de PDF).
3. **Multiselect de "quem baixou" no PDF de Comissão Bordado do admin_master** (já existe — só validar).

---

## 1. Correção dos 9 pedidos (migration SQL one-shot)

Identificar os pedidos: histórico contém `Baixa Bordado 7Estrivos` em 04/05/2026 com `usuario` da Mariana ADM, e estado atual `Pespontando` (ou seguinte). Para cada um:

- Inserir um evento sintético no `historico` logo **após** a baixa, marcando que o pedido foi **re-baixado** retroativamente para fins de comissão. Mas isso muda histórico = ruim.

Alternativa mais limpa, que NÃO mexe em histórico nem em código:

**Remover do `historico` os eventos intermediários (`Aguardando`) que estão entre a baixa da Mariana e o `Pespontando`**, mantendo só `Baixa Bordado 7Estrivos` → `Pespontando`. Assim a regra atual valida a baixa sem exceções.

Migration SQL faz, para esses 9 IDs específicos (lista vou levantar via SELECT antes de aplicar):

```sql
UPDATE public.orders
SET historico = (
  SELECT jsonb_agg(h ORDER BY ord)
  FROM (
    SELECT h, ord
    FROM jsonb_array_elements(historico) WITH ORDINALITY arr(h, ord)
    WHERE NOT (
      h->>'local' = 'Aguardando'
      AND (h->>'data') = '2026-05-04'
      AND (h->>'hora') BETWEEN '10:39' AND '10:50'
    )
  ) sub
)
WHERE id = ANY(ARRAY[...9 ids...]::uuid[]);
```

Antes da migration, vou rodar SELECT para confirmar exatamente quais IDs e horários — você revê e aprova a migration antes dela rodar.

> Vantagens: zero mudança de código, zero exceção permanente, comportamento futuro idêntico ao atual.

---

## 2. Portal /bordado — isolar quadros e PDF dos bordadeiros

Em `src/pages/BordadoPortalPage.tsx`:

- Carregar nomes de usuários com role `bordado` via novo RPC `list_bordado_usuarios()` (SECURITY DEFINER, retorna `text[]`).
- **Quadro "Baixa Bordado 7Estrivos"**: filtrar localmente para mostrar só pedidos cujo último evento `Baixa Bordado 7Estrivos` no histórico tem `usuario` ∈ nomes bordado. Pedidos baixados pela Mariana saem de Entrada (status mudou) e ficam ocultos do quadro Baixa.
- **Quadro "Entrada Bordado 7Estrivos"**: sem mudança, mostra tudo.
- **PDF "Resumo de baixas" do portal**: passar a lista de nomes bordado como 5º argumento (`usuariosFiltro`) de `generateBordadoBaixaResumoPDF`. A função já aceita esse parâmetro e filtra corretamente. PDF do portal só lista baixas do Neto/Débora.

Em `src/components/BordadoOrderView.tsx`: nenhuma mudança — é a tela individual do pedido.

## 3. Novo RPC

```sql
CREATE OR REPLACE FUNCTION public.list_bordado_usuarios()
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(p.nome_completo), ARRAY[]::text[])
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'bordado';
$$;
```

Qualquer autenticado pode chamar (apenas devolve nomes, não dados sensíveis).

## 4. PDF Comissão Bordado do admin_master

Em `SpecializedReports.tsx`: o multiselect `filterBordadoUsuarios` já existe e já passa para o PDF. Validar que a lista de opções inclui **todos os usuários que aparecem como `usuario` em eventos `Baixa Bordado 7Estrivos`** no histórico (Mariana ADM, Juliana, Neto, Débora, etc.), não só role `bordado`. Se não estiver, ajustar a fonte da lista (consultar histórico distinct, ou unir profiles + nomes do histórico).

## 5. Memory

Atualizar `mem://auth/role-bordado`:
- Quadro Baixa do portal /bordado mostra apenas baixas feitas por usuários role `bordado` (filtro de UI).
- PDF do portal sempre filtra por role bordado (5º arg `usuariosFiltro`).
- PDF Comissão Bordado do admin tem multiselect "quem baixou" para auditoria.
- Regra de baixa válida (`ETAPAS_ANTES_BAIXA`) **não muda** — é universal.

---

## Arquivos tocados

- Migration SQL (1 arquivo): correção dos 9 pedidos + criação do RPC `list_bordado_usuarios`.
- `src/pages/BordadoPortalPage.tsx`: carrega nomes bordado, filtra quadro Baixa, passa ao PDF.
- `src/components/SpecializedReports.tsx`: validar/ajustar fonte do multiselect.
- `mem://auth/role-bordado`: atualizar.

## Próximo passo após aprovação

Antes de aplicar a migration, vou rodar um SELECT para listar os 9 pedidos exatos (id + horários do "Aguardando" sintético) e te mostrar pra confirmar antes de remover do histórico.
