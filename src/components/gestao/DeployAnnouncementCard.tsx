import { useEffect, useState } from 'react';
import { Megaphone, Save, Trash2, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AnnouncementRow {
  id: string;
  scheduled_at: string;
  mensagem: string | null;
  ativo: boolean;
  updated_at: string;
}

const MENSAGEM_PADRAO =
  'Uma nova versão do sistema será publicada. Salve seu trabalho — pedidos não salvos podem ser perdidos.';

// Converte ISO -> valor pra <input type="datetime-local"> no fuso local
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Converte valor de datetime-local (no fuso local) -> ISO UTC
function localInputToIso(val: string): string | null {
  if (!val) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function DeployAnnouncementCard() {
  const { user } = useAuth();
  const [current, setCurrent] = useState<AnnouncementRow | null>(null);
  const [scheduledLocal, setScheduledLocal] = useState('');
  const [mensagem, setMensagem] = useState(MENSAGEM_PADRAO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const desdeIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('system_announcements')
      .select('id, scheduled_at, mensagem, ativo, updated_at')
      .eq('ativo', true)
      .gte('scheduled_at', desdeIso)
      .order('scheduled_at', { ascending: true })
      .limit(1);
    if (error) {
      toast.error('Erro ao carregar aviso atual');
      setLoading(false);
      return;
    }
    const row = data && data[0] ? (data[0] as AnnouncementRow) : null;
    setCurrent(row);
    if (row) {
      setScheduledLocal(isoToLocalInput(row.scheduled_at));
      setMensagem(row.mensagem ?? MENSAGEM_PADRAO);
    } else {
      setScheduledLocal('');
      setMensagem(MENSAGEM_PADRAO);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('system-announcements-admin')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_announcements' },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSave = async () => {
    const iso = localInputToIso(scheduledLocal);
    if (!iso) {
      toast.error('Informe data e horário válidos');
      return;
    }
    if (new Date(iso).getTime() < Date.now() - 60_000) {
      toast.error('O horário não pode ser no passado');
      return;
    }

    setSaving(true);
    if (current) {
      const { error } = await supabase
        .from('system_announcements')
        .update({
          scheduled_at: iso,
          mensagem: mensagem.trim() || null,
          ativo: true,
        })
        .eq('id', current.id);
      setSaving(false);
      if (error) {
        toast.error('Erro ao atualizar aviso');
        return;
      }
      toast.success('Aviso atualizado para todos os usuários');
    } else {
      const { error } = await supabase.from('system_announcements').insert({
        tipo: 'deploy',
        scheduled_at: iso,
        mensagem: mensagem.trim() || null,
        ativo: true,
        created_by: user?.id ?? null,
      });
      setSaving(false);
      if (error) {
        toast.error('Erro ao publicar aviso');
        return;
      }
      toast.success('Aviso publicado para todos os usuários');
    }
    load();
  };

  const handleRemove = async () => {
    if (!current) return;
    if (!window.confirm('Remover o aviso de nova versão? Ele somem da tela de todos os usuários.')) return;
    setSaving(true);
    const { error } = await supabase
      .from('system_announcements')
      .update({ ativo: false })
      .eq('id', current.id);
    setSaving(false);
    if (error) {
      toast.error('Erro ao remover aviso');
      return;
    }
    toast.success('Aviso removido');
    load();
  };

  return (
    <Card className="mb-4 border-primary/30">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="font-montserrat text-lg font-semibold lowercase">aviso de nova versão</h2>
          {current ? (
            <Badge className="ml-auto bg-amber-500 text-amber-950 hover:bg-amber-500">
              ativo — agendado
            </Badge>
          ) : (
            <Badge variant="outline" className="ml-auto">nenhum aviso</Badge>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> carregando...
          </div>
        ) : (
          <div className="space-y-4">
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
                <p className="text-[10px] text-muted-foreground text-right">
                  {mensagem.length}/300
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {current ? 'atualizar aviso' : 'publicar aviso'}
              </Button>
              {current && (
                <Button
                  variant="outline"
                  onClick={handleRemove}
                  disabled={saving}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> remover aviso
                </Button>
              )}
              <p className="ml-auto text-xs text-muted-foreground">
                O banner aparece automaticamente em todas as telas para todos os usuários logados.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
