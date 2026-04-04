

## Habilitar Grade para vendedora "Juliana Cristina Ribeiro" com Cliente obrigatório

### Problema

Atualmente o campo "Tamanho / Grade" só aparece quando o vendedor selecionado é "Estoque". A vendedora "Juliana Cristina Ribeiro" precisa do mesmo comportamento de grade, porém com o campo "Cliente" se tornando obrigatório.

### Alteração: `src/pages/OrderPage.tsx`

#### 1. Criar helper para identificar vendedores com grade

Criar constante/condição reutilizável que identifica se o vendedor permite grade:

```typescript
const isGradeVendedor = isAdmin && (vendedorSelecionado === 'Estoque' || vendedorSelecionado === 'Juliana Cristina Ribeiro');
```

#### 2. Substituir todas as ocorrências de `vendedorSelecionado === 'Estoque'`

Há ~4 locais que verificam `isAdmin && vendedorSelecionado === 'Estoque'`:
- **Linha 420** (validação `isEstoqueGrade`): trocar para `isGradeVendedor && gradeItems.length > 0`
- **Linha 522** (confirmOrder `isEstoqueGrade`): mesma troca
- **Linha 734** (renderização do campo Grade): trocar condição para `isGradeVendedor`

#### 3. Tornar "Cliente" obrigatório para Juliana

Na validação do `handleSubmit` (~linha 421), adicionar condicional:

```typescript
...(vendedorSelecionado === 'Juliana Cristina Ribeiro' ? [[cliente.trim(), 'Cliente'] as [string, string]] : []),
```

#### 4. Indicar visualmente que Cliente é obrigatório

No campo Cliente (~linha 725), adicionar asterisco vermelho condicional:

```typescript
<label className={cls.label}>
  Cliente
  {vendedorSelecionado === 'Juliana Cristina Ribeiro' && <span className="text-destructive ml-0.5">*</span>}
</label>
```

E mudar o placeholder quando for Juliana:

```typescript
placeholder={vendedorSelecionado === 'Juliana Cristina Ribeiro' ? "Nome do cliente (obrigatório)" : "Nome do cliente (opcional)"}
```

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/OrderPage.tsx` | Condição de grade inclui Juliana, cliente obrigatório para Juliana, indicação visual |

