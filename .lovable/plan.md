

## Ajustes nos relatórios de produção (PDF)

### Alterações

**Arquivo**: `src/components/SpecializedReports.tsx`

#### 1. Reduzir tamanho das células para caber mais tamanhos
Na função `drawBlockLayout` (linha 140):
- Reduzir `cellW` de `14` para `11`
- Reduzir `fontSize` dos valores de `7` para `6`
- Isso permite ~16 tamanhos diferentes sem ultrapassar a margem (vs ~10 atualmente)

#### 2. Forro — remover informação de forma
No `generateForroPDF` (linhas 417-421):
- Agrupar apenas por `modelo` (sem forma no key)
- Mudar description de `${g.modelo} — Forma ${g.forma}` para apenas `${g.modelo}`

#### 3. Palmilha — remover informação de modelo
No `generatePalmilhaPDF` (linhas 460-464):
- Agrupar apenas por `forma`
- Mudar badgeLabel de `'MODELO'` para `'FORMA'`
- Mudar description para apenas `Forma ${g.forma}`

