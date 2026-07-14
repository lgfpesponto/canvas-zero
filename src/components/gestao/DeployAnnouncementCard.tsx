import { useEffect, useState } from 'react';
import { Megaphone, Save, Trash2, Loader2, Calendar, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AnnouncementRow {
  id: string;
  scheduled_at: string;
  expires_at: string | null;
  mensagem: string | null;
  ativo: boolean;
  updated_at: string;
  tipo: string;
}

const MENSAGEM_PADRAO =
  'Uma nova versão do sistema será publicada. Salve seu trabalho — pedidos não salvos podem ser perdidos.';

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(val: string): string | null {
  if (!val) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function DeployAnnouncementCard() {
  const { user } = useAuth();

  // Deploy
  const [deployRow, setDeployRow] = useState<AnnouncementRow | null>(null);
  const [scheduledLocal, setScheduledLocal] = useState('');
  const [mensagem, setMensagem] = useState(MENSAGEM_PADRAO);

  // Comunicado
  const [comunicadoRow, setComunicadoRow] = useState<AnnouncementRow | null>(null);
  const [expiresLocal, setExpiresLocal] = useState('');
  const [comunicadoMsg, setComunicadoMsg] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const nowIso = new Date().toISOString();
    const desdeIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const [{ data: dep }, { data: com }] = await Promise.all([
      supabase
        .from('system_announcements')
        .select('id, scheduled_at, expires_at, mensagem, ativo, updated_at, tipo')
        .eq('tipo', 'deploy')
        .eq('ativo', true)
        .gte('scheduled_at', desdeIso)
        .order('scheduled_at', { ascending: true })
        .limit(1),
      supabase
        .from('system_announcements')
        .select('id, scheduled_at, expires_at, mensagem, ativo, updated_at, tipo')
        .eq('tipo', 'comunicado')
        .eq('ativo', true)
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    const d = dep && dep[0] ? (dep[0] as AnnouncementRow) : null;
    setDeployRow(d);
    if (d) {
      setScheduledLocal(isoToLocalInput(d.scheduled_at));
      setMensagem(d.mensagem ?? MENSAGEM_PADRAO);
    } else {
      setScheduledLocal('');
      setMensagem(MENSAGEM_PADRAO);
    }

    const c = com && com[0] ? (com[0] as AnnouncementRow) : null;
    setComunicadoRow(c);
    if (c) {
      setExpiresLocal(c.expires_at ? isoToLocalInput(c.expires_at) : '');
      setComunicadoMsg(c.mensagem ?? '');
    } else {
      setExpiresLocal('');
      setComunicadoMsg('');
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase.channel(`system-announcements-admin-${Math.random().toString(36).slice(2)}`);
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'system_announcements' },
      () => load()
    );
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSaveDeploy = async () => {
    const iso = localInputToIso(scheduledLocal);
    if (!iso) return toast.error('Informe data e horário válidos');
    if (new Date(iso).getTime() < Date.now() - 60_000) return toast.error('O horário não pode ser no passado');

    setSaving(true);
    if (deployRow) {
      const { error } = await supabase
        .from('system_announcements')
        .update({ scheduled_at: iso, mensagem: mensagem.trim() || null, ativo: true })
        .eq('id', deployRow.id);
      setSaving(false);
      if (error) return toast.error('Erro ao atualizar aviso');
      toast.success('Aviso atualizado');
    } else {
      const { error } = await supabase.from('system_announcements').insert({
        tipo: 'deploy',
        scheduled_at: iso,
        mensagem: mensagem.trim() || null,
        ativo: true,
        created_by: user?.id ?? null,
      });
      setSaving(false);
      if (error) return toast.error('Erro ao publicar aviso');
      toast.success('Aviso publicado');
    }
    load();
  };

  const handleRemoveDeploy = async () => {
    if (!deployRow) return;
    if (!window.confirm('Remover o aviso de nova versão?')) return;
    setSaving(true);
    const { error } = await supabase
      .from('system_announcements')
      .update({ ativo: false })
      .eq('id', deployRow.id);
    setSaving(false);
    if (error) return toast.error('Erro ao remover aviso');
    toast.success('Aviso removido');
    load();
  };

  const handleSaveComunicado = async () => {
    if (!comunicadoMsg.trim()) return toast.error('Informe a mensagem do comunicado');
    const iso = localInputToIso(expiresLocal);
    if (!iso) return toast.error('Informe data/hora de expiração');
    if (new Date(iso).getTime() < Date.now() + 60_000) return toast.error('A expiração precisa ser no futuro');

    setSaving(true);
    if (comunicadoRow) {
      const { error } = await supabase
        .from('system_announcements')
        .update({ mensagem: comunicadoMsg.trim(), expires_at: iso, ativo: true })
        .eq('id', comunicadoRow.id);
      setSaving(false);
      if (error) return toast.error('Erro ao atualizar comunicado');
      toast.success('Comunicado atualizado');
    } else {
      const { error } = await supabase.from('system_announcements').insert({
        tipo: 'comunicado',
        scheduled_at: new Date().toISOString(),
        expires_at: iso,
        mensagem: comunicadoMsg.trim(),
        ativo: true,
        created_by: user?.id ?? null,
      });
      setSaving(false);
      if (error) return toast.error('Erro ao publicar comunicado');
      toast.success('Comunicado publicado');
    }
    load();
  };

  const handleRemoveComunicado = async () => {
    if (!comunicadoRow) return;
    if (!window.confirm('Remover o comunicado?')) return;
    setSaving(true);
    const { error } = await supabase
      .from('system_announcements')
      .update({ ativo: false })
      .eq('id', comunicadoRow.id);
    setSaving(false);
    if (error) return toast.error('Erro ao remover comunicado');
    toast.success('Comunicado removido');
    load();
  };

  return (
    <Card className="mb-4 border-primary/30">
      <CardContent className="p-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> carregando...
          </div>
        ) : (
          <Tabs defaultValue="deploy">
            <TabsList>
              <TabsTrigger value="deploy" className="gap-1.5">
                <Megaphone className="h-4 w-4" /> aviso de deploy
                {deployRow && <Badge className="ml-1 bg-amber-500 text-amber-950 hover:bg-amber-500">ativo</Badge>}
              </TabsTrigger>
              <TabsTrigger value="comunicado" className="gap-1.5">
                <Info className="h-4 w-4" /> comunicado geral
                {comunicadoRow && <Badge className="ml-1 bg-blue-500 text-white hover:bg-blue-500">ativo</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="deploy" className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-[auto_1fr]">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> data e horário do deploy
                  </label>
                  <Input
                    type="datetime-local"
                    value={scheduledLocal}
                    onChange={e => setScheduledLocal(e.target.value)}
                    className="w-full md:w-64"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    mensagem (opcional — padrão se vazio)
                  </label>
                  <Textarea
                    value={mensagem}
                    onChange={e => setMensagem(e.target.value)}
                    rows={3}
                    placeholder={MENSAGEM_PADRAO}
                    maxLength={300}
                  />
                  <p className="text-[10px] text-muted-foreground text-right">{mensagem.length}/300</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleSaveDeploy} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {deployRow ? 'atualizar aviso' : 'publicar aviso'}
                </Button>
                {deployRow && (
                  <Button
                    variant="outline"
                    onClick={handleRemoveDeploy}
                    disabled={saving}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" /> remover aviso
                  </Button>
                )}
                <p className="ml-auto text-xs text-muted-foreground">
                  Banner amarelo com contagem regressiva até a data do deploy.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="comunicado" className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-[auto_1fr]">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> expira em
                  </label>
                  <Input
                    type="datetime-local"
                    value={expiresLocal}
                    onChange={e => setExpiresLocal(e.target.value)}
                    className="w-full md:w-64"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">mensagem do comunicado</label>
                  <Textarea
                    value={comunicadoMsg}
                    onChange={e => setComunicadoMsg(e.target.value)}
                    rows={3}
                    placeholder="Ex: Sexta-feira (17/07) não haverá expediente."
                    maxLength={500}
                  />
                  <p className="text-[10px] text-muted-foreground text-right">{comunicadoMsg.length}/500</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleSaveComunicado} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {comunicadoRow ? 'atualizar comunicado' : 'publicar comunicado'}
                </Button>
                {comunicadoRow && (
                  <Button
                    variant="outline"
                    onClick={handleRemoveComunicado}
                    disabled={saving}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" /> remover comunicado
                  </Button>
                )}
                <p className="ml-auto text-xs text-muted-foreground">
                  Banner azul sem contagem — some sozinho ao expirar.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
