import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Users, RefreshCw, Search, AlertTriangle, Circle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePresenceState, type PresencePayload } from '@/hooks/usePresenceTracker';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import DeployAnnouncementCard from '@/components/gestao/DeployAnnouncementCard';
import RecalcPrecosRunner from '@/components/gestao/RecalcPrecosRunner';

interface PresenceUser extends PresencePayload {
  presence_ref?: string;
}

const ROLE_LABEL: Record<string, string> = {
  admin_master: 'Admin Master',
  admin_producao: 'Admin Produção',
  admin: 'Admin',
  vendedor: 'Vendedor',
  vendedor_comissao: 'Vendedor (comissão)',
  user: 'Usuário',
};

const ROLE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  admin_master: 'default',
  admin_producao: 'secondary',
  admin: 'secondary',
  vendedor: 'outline',
  vendedor_comissao: 'outline',
  user: 'outline',
};

function timeAgo(iso: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `há ${diff}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

function durationSince(iso: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return `${h}h ${m}min`;
}

export default function GestaoPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const presence = usePresenceState();
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');

  // Gate: só admin_master
  useEffect(() => {
    if (!loading && role !== 'admin_master') {
      navigate('/', { replace: true });
    }
  }, [loading, role, navigate]);

  const users = useMemo<PresenceUser[]>(
    () => [...presence].sort((a, b) => a.nome_completo.localeCompare(b.nome_completo)),
    [presence]
  );

  // Tick a cada 5s pra atualizar "há Xs"
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 5000);
    return () => window.clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return users.filter(u => {
      if (roleFilter !== 'todos' && u.role !== roleFilter) return false;
      if (!s) return true;
      return (
        u.nome_completo.toLowerCase().includes(s) ||
        u.nome_usuario.toLowerCase().includes(s) ||
        u.page.toLowerCase().includes(s)
      );
    });
  }, [users, search, roleFilter, tick]);

  const total = users.length;
  const podePublicar = total <= 1; // só você (admin_master) online

  if (loading || role !== 'admin_master') return null;

  const handleManualRefresh = () => setTick(t => t + 1);

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-6xl"
      >
        <div className="mb-6 flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="font-montserrat text-2xl font-bold text-foreground lowercase">
            gestão
          </h1>
          <Badge variant="outline" className="ml-2 gap-1.5 text-xs">
            <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 animate-pulse" />
            ao vivo
          </Badge>
        </div>

        {/* Aviso de nova versão (deploy) */}
        <DeployAnnouncementCard />

        {/* Varredura retroativa de preços (auto-roda 1× por admin) */}
        <RecalcPrecosRunner />

        {/* Cards de resumo */}
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-full bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">{total}</div>
                <div className="text-sm text-muted-foreground lowercase">
                  {total === 1 ? 'usuário online agora' : 'usuários online agora'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={podePublicar ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/50 bg-amber-500/5'}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-full p-3 ${podePublicar ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
                {podePublicar
                  ? <Circle className="h-6 w-6 fill-emerald-500 text-emerald-500" />
                  : <AlertTriangle className="h-6 w-6 text-amber-600" />}
              </div>
              <div>
                <div className={`text-base font-semibold ${podePublicar ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {podePublicar ? 'Seguro para publicar' : 'Evite publicar agora'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {podePublicar
                    ? 'Nenhum outro usuário usando o portal.'
                    : `Há ${total - 1} ${total - 1 === 1 ? 'pessoa usando' : 'pessoas usando'} o portal além de você.`}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-4">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, login ou página..."
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as funções</SelectItem>
                {Object.entries(ROLE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleManualRefresh} className="gap-1.5">
              <RefreshCw className="h-4 w-4" /> atualizar
            </Button>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Página atual</TableHead>
                  <TableHead>Conectado há</TableHead>
                  <TableHead>Último sinal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum usuário online no momento.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(u => {
                    const isMe = u.user_id === user?.id;
                    return (
                      <TableRow key={u.user_id} className={isMe ? 'bg-primary/5' : ''}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
                            {u.nome_completo}
                            {isMe && <Badge variant="secondary" className="ml-1 text-[10px]">você</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.nome_usuario || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ROLE_VARIANT[u.role] || 'outline'} className="text-xs">
                            {ROLE_LABEL[u.role] || u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{u.page || '/'}</code>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {durationSince(u.joined_at)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {timeAgo(u.last_seen)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="mt-3 text-xs text-muted-foreground">
          A lista é atualizada em tempo real via Supabase Realtime. Usuários inativos são removidos automaticamente em até ~60s após fecharem a aba.
        </p>
      </motion.div>
    </div>
  );
}
