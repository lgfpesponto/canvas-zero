import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNfeAccess } from "@/hooks/useNfeAccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";

type Row = {
  id: string;
  referencia: string;
  descricao: string | null;
  ncm: string | null;
  cest: string | null;
  cfop_padrao: string | null;
  unidade_comercial: string | null;
  origem_mercadoria: number | null;
  cst_icms: string | null;
  cst_pis: string | null;
  cst_cofins: string | null;
  aliq_icms: number | null;
  aliq_pis: number | null;
  aliq_cofins: number | null;
};

export default function ConfiguracoesTributacao() {
  const allowed = useNfeAccess();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [dirty, setDirty] = useState<Record<string, Partial<Row>>>({});
  const [saving, setSaving] = useState(false);
  const [bulk, setBulk] = useState({ ncm: "", cfop_padrao: "", cst_icms: "", cst_pis: "", cst_cofins: "" });
  const [novaRef, setNovaRef] = useState("");

  useEffect(() => { if (allowed) load(); }, [allowed]);

  if (!allowed) return <Navigate to="/" replace />;

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("nfe_tributacao_referencias")
      .select("id, referencia, descricao, ncm, cest, cfop_padrao, unidade_comercial, origem_mercadoria, cst_icms, cst_pis, cst_cofins, aliq_icms, aliq_pis, aliq_cofins")
      .order("referencia");
    setRows((data as Row[]) || []);
    setLoading(false);
  }

  function patch(id: string, field: keyof Row, value: any) {
    setDirty(d => ({ ...d, [id]: { ...d[id], [field]: value } }));
    setRows(rs => rs.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  async function saveAll() {
    const ids = Object.keys(dirty);
    if (ids.length === 0) { toast.message("Nada para salvar"); return; }
    setSaving(true);
    let okCount = 0;
    for (const id of ids) {
      const { error } = await supabase.from("nfe_tributacao_referencias").update(dirty[id]).eq("id", id);
      if (!error) okCount++;
    }
    setSaving(false);
    setDirty({});
    toast.success(`${okCount} de ${ids.length} referências atualizadas`);
    load();
  }

  async function aplicarMassa() {
    const visiveis = filtered;
    if (visiveis.length === 0) { toast.error("Nenhuma referência visível"); return; }
    const patchObj: any = {};
    Object.entries(bulk).forEach(([k, v]) => { if (v) patchObj[k] = v; });
    if (Object.keys(patchObj).length === 0) { toast.message("Preencha pelo menos um campo no aplicador"); return; }
    setSaving(true);
    const ids = visiveis.map(r => r.id);
    const { error } = await supabase.from("nfe_tributacao_referencias").update(patchObj).in("id", ids);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Aplicado em ${ids.length} referências`);
    load();
  }

  async function adicionar() {
    const r = novaRef.trim();
    if (!r) { toast.error("Informe a referência"); return; }
    const { error } = await supabase.from("nfe_tributacao_referencias").insert({ referencia: r } as any);
    if (error) { toast.error(error.message); return; }
    setNovaRef("");
    toast.success("Referência adicionada");
    load();
  }

  async function remover(id: string) {
    if (!confirm("Remover esta referência?")) return;
    const { error } = await supabase.from("nfe_tributacao_referencias").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removida");
    load();
  }

  const filtered = rows.filter(r => {
    const f = filter.toLowerCase();
    return !f || r.referencia.toLowerCase().includes(f) || (r.descricao || "").toLowerCase().includes(f);
  });

  if (loading) return <div className="p-6">Carregando…</div>;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tributação por Produto (NF-e)</h1>
        <p className="text-sm text-muted-foreground">NCM, CFOP, CST e alíquotas usados na emissão de NF-e</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Adicionar referência</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Código/nome da referência" value={novaRef} onChange={e => setNovaRef(e.target.value)} className="max-w-sm" />
          <Button onClick={adicionar}><Plus className="w-4 h-4 mr-2" />Adicionar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Aplicar em massa (nos filtrados)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Input placeholder="NCM" value={bulk.ncm} onChange={e => setBulk({ ...bulk, ncm: e.target.value })} />
          <Input placeholder="CFOP" value={bulk.cfop_padrao} onChange={e => setBulk({ ...bulk, cfop_padrao: e.target.value })} />
          <Input placeholder="CST ICMS" value={bulk.cst_icms} onChange={e => setBulk({ ...bulk, cst_icms: e.target.value })} />
          <Input placeholder="CST PIS" value={bulk.cst_pis} onChange={e => setBulk({ ...bulk, cst_pis: e.target.value })} />
          <Input placeholder="CST COFINS" value={bulk.cst_cofins} onChange={e => setBulk({ ...bulk, cst_cofins: e.target.value })} />
          <Button onClick={aplicarMassa} disabled={saving}>Aplicar</Button>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Input placeholder="Filtrar por referência ou descrição…" value={filter} onChange={e => setFilter(e.target.value)} className="max-w-sm" />
        <Button onClick={saveAll} disabled={saving || Object.keys(dirty).length === 0}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar alterações ({Object.keys(dirty).length})
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referência</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>NCM</TableHead>
                <TableHead>CFOP</TableHead>
                <TableHead>Un.</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>CST ICMS</TableHead>
                <TableHead>% ICMS</TableHead>
                <TableHead>CST PIS</TableHead>
                <TableHead>% PIS</TableHead>
                <TableHead>CST COFINS</TableHead>
                <TableHead>% COFINS</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.referencia}</TableCell>
                  <TableCell><Input className="h-8 w-40" value={r.descricao || ""} onChange={e => patch(r.id, "descricao", e.target.value)} /></TableCell>
                  <TableCell><Input className="h-8 w-24" value={r.ncm || ""} onChange={e => patch(r.id, "ncm", e.target.value)} /></TableCell>
                  <TableCell><Input className="h-8 w-20" value={r.cfop_padrao || ""} onChange={e => patch(r.id, "cfop_padrao", e.target.value)} /></TableCell>
                  <TableCell><Input className="h-8 w-14" value={r.unidade_comercial || ""} onChange={e => patch(r.id, "unidade_comercial", e.target.value)} /></TableCell>
                  <TableCell><Input className="h-8 w-12" value={r.origem_mercadoria ?? 0} onChange={e => patch(r.id, "origem_mercadoria", Number(e.target.value))} /></TableCell>
                  <TableCell><Input className="h-8 w-16" value={r.cst_icms || ""} onChange={e => patch(r.id, "cst_icms", e.target.value)} /></TableCell>
                  <TableCell><Input className="h-8 w-16" value={r.aliq_icms ?? 0} onChange={e => patch(r.id, "aliq_icms", Number(e.target.value))} /></TableCell>
                  <TableCell><Input className="h-8 w-16" value={r.cst_pis || ""} onChange={e => patch(r.id, "cst_pis", e.target.value)} /></TableCell>
                  <TableCell><Input className="h-8 w-16" value={r.aliq_pis ?? 0} onChange={e => patch(r.id, "aliq_pis", Number(e.target.value))} /></TableCell>
                  <TableCell><Input className="h-8 w-16" value={r.cst_cofins || ""} onChange={e => patch(r.id, "cst_cofins", e.target.value)} /></TableCell>
                  <TableCell><Input className="h-8 w-16" value={r.aliq_cofins ?? 0} onChange={e => patch(r.id, "aliq_cofins", Number(e.target.value))} /></TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => remover(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-6">Nenhuma referência cadastrada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
