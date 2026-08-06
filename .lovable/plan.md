# Gerar etiquetas (A4) para pedidos de estoque

Não precisa de conector nem serviço externo — dá para fazer inteiramente no portal, com a mesma biblioteca de PDF já usada nos outros relatórios.

## O que será feito

Na página "Meus pedidos", no painel do scanner/seleção, ao lado do botão "Criar produto" (que já aparece só para pedidos do vendedor Estoque em "Baixa Estoque"), entra um novo botão **"Gerar etiquetas (N)"**, com a mesma regra de habilitação.

O botão gera um PDF A4 com grade igual ao exemplo enviado:

```text
[ foto ][ texto ][ foto ][ texto ]
[ foto ][ texto ][ foto ][ texto ]
... 5 linhas = 10 etiquetas por página
```

- Foto do produto recortada sobre fundo branco.
- Texto: nome do produto e, abaixo, o tamanho em destaque.
- Continua em novas páginas quando passar de 10 etiquetas.

## Detalhes técnicos

- Fonte dos dados: pedido → produto de estoque vinculado (`foto_url`, nome, tamanho); fallback para a foto/nome do próprio pedido quando não houver produto vinculado.
- Imagens carregadas e convertidas para dataURL antes da montagem do PDF, com placeholder branco se a foto falhar.
- Reutiliza o diálogo de confirmação com spinner já usado nos outros relatórios.
- Sem mudanças de banco.

## Regras definidas

- Uma etiqueta por pedido selecionado/escaneado, na ordem da seleção.
- Sem número do pedido na etiqueta: apenas nome do produto e tamanho.
- Pedidos da mesma grade reaproveitam a mesma foto (cache por produto).

