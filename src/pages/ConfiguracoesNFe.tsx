import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNfeAccess } from "@/hooks/useNfeAccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type NFeConfig = {
  id?: string;
  cnpj: string; razao_social: string; nome_fantasia?: string;
  inscricao_estadual: string; inscricao_municipal?: string;
  regime_tributario: number; crt: number; cnae?: string;
  logradouro: string; numero: string; complemento?: string;
  bairro: string; cep: string; cod_municipio: string;
  municipio: string; uf: string; telefone?: string;
  ambiente: number; serie: number; proximo_numero: number;
  csc?: string; csc_id?: string;
  certificado_path?: string | null; certificado_nome?: string | null; certificado_validade?: string | null;
};

const EMPTY: NFeConfig = {
  cnpj: "", razao_social: "", inscricao_estadual: "", regime_tributario: 1, crt: 1,
  logradouro: "", numero: "", bairro: "", cep: "", cod_municipio: "", municipio: "", uf: "SP",
  ambiente: 2, serie: 1, proximo_numero: 1,
};

export default function ConfiguracoesNFe() {
  const allowed = useNfeAccess();
  const [cfg, setCfg] = useState<NFeConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => { if (allowed) load(); }, [allowed]);

  if (!allowed) return <Navigate to="/" replace />;

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("nfe_config").select("*").maybeSingle();
    if (data) setCfg(data as NFeConfig);
    setLoading(false);
  }

  function set<K extends keyof NFeConfig>(k: K, v: NFeConfig[K]) {
    setCfg(prev => ({ ...prev, [k]: v }));
  }

  async function save() {
    setSaving(true);
    const payload = { ...cfg };
    const { error } = cfg.id
      ? await supabase.from("nfe_config").update(payload).eq("id", cfg.id)
      : await supabase.from("nfe_config").insert(payload as any).select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Configurações salvas");
    load();
  }

  async function uploadCert(file: File) {
    if (!file.name.toLowerCase().endsWith(".pfx") && !file.name.toLowerCase().endsWith(".p12")) {
      toast.error("Envie um arquivo .pfx ou .p12"); return;
    }
    setUploading(true);
    const path = `cert-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("nfe-certificados").upload(path, file, { upsert: true });
    if (error) { setUploading(false); toast.error(error.message); return; }
    const updates = { certificado_path: path, certificado_nome: file.name };
    if (cfg.id) {
      await supabase.from("nfe_config").update(updates).eq("id", cfg.id);
    } else {
      const { data } = await supabase.from("nfe_config").insert({ ...cfg, ...updates } as any).select().single();
      if (data) setCfg(data as NFeConfig);
    }
    setUploading(false);
    toast.success("Certificado enviado. Configure a senha (secret NFE_CERT_PASSWORD).");
    load();
  }

  async function testarConexao() {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("nfe-status-servico", { body: {} });
      if (error) throw error;
      if (data?.ok) toast.success(`Conexão OK (HTTP ${data.http_status}) — ${data.endpoint}`);
      else toast.error(`Sem resposta: ${data?.preview?.slice(0, 200) || "erro de rede"}`);
      if (data?.aviso) toast.message(data.aviso);
    } catch (e: any) { toast.error(e.message || String(e)); }
    finally { setTesting(false); }
  }

  if (loading) return <div className="p-6">Carregando…</div>;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configurações NF-e</h1>
          <p className="text-sm text-muted-foreground">Emitente, certificado A1 e ambiente SEFAZ</p>
        </div>
        <Badge variant={cfg.ambiente === 1 ? "destructive" : "secondary"}>
          {cfg.ambiente === 1 ? "PRODUÇÃO" : "HOMOLOGAÇÃO"}
        </Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Emitente</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label>CNPJ *</Label><Input value={cfg.cnpj} onChange={e => set("cnpj", e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Razão Social *</Label><Input value={cfg.razao_social} onChange={e => set("razao_social", e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Nome Fantasia</Label><Input value={cfg.nome_fantasia || ""} onChange={e => set("nome_fantasia", e.target.value)} /></div>
          <div><Label>Inscrição Estadual *</Label><Input value={cfg.inscricao_estadual} onChange={e => set("inscricao_estadual", e.target.value)} /></div>
          <div><Label>Inscrição Municipal</Label><Input value={cfg.inscricao_municipal || ""} onChange={e => set("inscricao_municipal", e.target.value)} /></div>
          <div><Label>CNAE</Label><Input value={cfg.cnae || ""} onChange={e => set("cnae", e.target.value)} /></div>
          <div><Label>Telefone</Label><Input value={cfg.telefone || ""} onChange={e => set("telefone", e.target.value)} /></div>
          <div>
            <Label>Regime Tributário *</Label>
            <Select value={String(cfg.regime_tributario)} onValueChange={v => set("regime_tributario", Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Simples Nacional</SelectItem>
                <SelectItem value="2">2 - Simples - excesso de sublimite</SelectItem>
                <SelectItem value="3">3 - Regime Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>CRT *</Label>
            <Select value={String(cfg.crt)} onValueChange={v => set("crt", Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Simples Nacional</SelectItem>
                <SelectItem value="2">2 - SN - excesso</SelectItem>
                <SelectItem value="3">3 - Regime Normal</SelectItem>
                <SelectItem value="4">4 - MEI</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Endereço</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-3"><Label>Logradouro *</Label><Input value={cfg.logradouro} onChange={e => set("logradouro", e.target.value)} /></div>
          <div><Label>Número *</Label><Input value={cfg.numero} onChange={e => set("numero", e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Complemento</Label><Input value={cfg.complemento || ""} onChange={e => set("complemento", e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Bairro *</Label><Input value={cfg.bairro} onChange={e => set("bairro", e.target.value)} /></div>
          <div><Label>CEP *</Label><Input value={cfg.cep} onChange={e => set("cep", e.target.value)} /></div>
          <div><Label>Cód. Município (IBGE) *</Label><Input value={cfg.cod_municipio} onChange={e => set("cod_municipio", e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Município *</Label><Input value={cfg.municipio} onChange={e => set("municipio", e.target.value)} /></div>
          <div><Label>UF *</Label><Input maxLength={2} value={cfg.uf} onChange={e => set("uf", e.target.value.toUpperCase())} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Numeração & Ambiente</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Ambiente *</Label>
            <Select value={String(cfg.ambiente)} onValueChange={v => set("ambiente", Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 - Homologação</SelectItem>
                <SelectItem value="1">1 - Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Série *</Label><Input type="number" value={cfg.serie} onChange={e => set("serie", Number(e.target.value))} /></div>
          <div><Label>Próximo nº NF-e *</Label><Input type="number" value={cfg.proximo_numero} onChange={e => set("proximo_numero", Number(e.target.value))} /></div>
          <div><Label>CSC ID (NFC-e)</Label><Input value={cfg.csc_id || ""} onChange={e => set("csc_id", e.target.value)} /></div>
          <div className="md:col-span-4"><Label>CSC (NFC-e)</Label><Input value={cfg.csc || ""} onChange={e => set("csc", e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5" />Certificado Digital A1</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {cfg.certificado_nome ? (
            <div className="text-sm">
              <span className="font-medium">{cfg.certificado_nome}</span>
              {cfg.certificado_validade && <span className="text-muted-foreground"> · válido até {new Date(cfg.certificado_validade).toLocaleDateString("pt-BR")}</span>}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Nenhum certificado enviado</div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="inline-flex">
              <input type="file" accept=".pfx,.p12" className="hidden" onChange={e => e.target.files?.[0] && uploadCert(e.target.files[0])} />
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm cursor-pointer">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Enviar .pfx
              </span>
            </label>
            <p className="text-xs text-muted-foreground">A senha do certificado é armazenada como secret <code>NFE_CERT_PASSWORD</code>.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar configurações"}</Button>
        <Button variant="outline" onClick={testarConexao} disabled={testing}>
          {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Testar conexão SEFAZ
        </Button>
      </div>

      <div className="text-xs text-muted-foreground border-l-2 border-amber-500 pl-3">
        <strong>Fase 1:</strong> esta tela permite cadastrar emitente, enviar certificado A1 e testar rede SEFAZ.
        Emissão real (assinatura XML + autorização + DANFE) requer Fase 2.
      </div>
    </div>
  );
}
