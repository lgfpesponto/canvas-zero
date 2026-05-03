import { useEffect, useState } from 'react';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Pencil, Trash2, Users, Loader2, Plus } from 'lucide-react';

interface Profile {
  id: string;
  nome_completo: string;
  nome_usuario: string;
  email: string;
  telefone: string;
  cpf_cnpj: string;
  created_at: string;
  role?: string;
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'admin_master', label: 'Admin Master' },
  { value: 'admin_producao', label: 'Admin Produção' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'vendedor_comissao', label: 'Vendedor Comissão' },
  { value: 'bordado', label: 'Bordado (portal restrito)' },
];

const PROTECTED_USERNAMES = ['7estrivos', 'fernanda', 'demo'];

const UsersManagementPage = () => {
  const { isLoggedIn, user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile & { newPassword: string }>>({});
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteProfile, setDeleteProfile] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ nomeCompleto: '', nomeUsuario: '', email: '', cpfCnpj: '', senha: '', role: 'vendedor' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn || !isAdmin) {
      navigate('/');
      return;
    }
    fetchProfiles();
  }, [isLoggedIn, isAdmin, authLoading]);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Erro ao carregar usuários', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    // Fetch roles for all users
    const { data: rolesData } = await supabase.from('user_roles').select('user_id, role');
    const roleMap: Record<string, string> = {};
    (rolesData || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });
    
    setProfiles((data || []).map(p => ({ ...p, role: roleMap[p.id] || 'vendedor' })));
    setLoading(false);
  };

  /* ── Create user ── */
  const handleCreate = async () => {
    if (!createForm.nomeUsuario || !createForm.senha) {
      toast({ title: 'Preencha pelo menos o nome de usuário e senha.', variant: 'destructive' });
      return;
    }
    setCreating(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await supabase.functions.invoke('create-user', {
      body: {
        nomeCompleto: createForm.nomeCompleto,
        nomeUsuario: createForm.nomeUsuario,
        email: createForm.email,
        cpfCnpj: createForm.cpfCnpj,
        senha: createForm.senha,
        role: createForm.role,
      },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (res.error) {
      toast({ title: 'Erro ao criar usuário', description: res.error.message, variant: 'destructive' });
    } else if (res.data?.error) {
      toast({ title: 'Erro ao criar usuário', description: res.data.error, variant: 'destructive' });
    } else {
      toast({ title: 'Usuário criado com sucesso!' });
      setShowCreate(false);
      setCreateForm({ nomeCompleto: '', nomeUsuario: '', email: '', cpfCnpj: '', senha: '', role: 'vendedor' });
      fetchProfiles();
    }
    setCreating(false);
  };

  /* ── Edit user ── */
  const openEdit = (p: Profile) => {
    setEditProfile(p);
    setEditForm({
      nome_completo: p.nome_completo,
      nome_usuario: p.nome_usuario,
      email: p.email,
      telefone: p.telefone,
      cpf_cnpj: p.cpf_cnpj,
      newPassword: '',
      role: p.role || 'vendedor',
    });
  };

  const sanitizeUsername = (u: string) =>
    u.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const handleSave = async () => {
    if (!editProfile) return;
    setSaving(true);

    const newUsernameRaw = (editForm.nome_usuario || '').trim();
    const oldUsernameSanitized = sanitizeUsername(editProfile.nome_usuario);
    const newUsernameSanitized = sanitizeUsername(newUsernameRaw);

    if (!newUsernameSanitized) {
      toast({ title: 'Nome de usuário inválido', description: 'Use apenas letras e números.', variant: 'destructive' });
      setSaving(false);
      return;
    }

    // 1) If username changed, sync Supabase Auth email FIRST (login depends on it)
    if (newUsernameSanitized !== oldUsernameSanitized) {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const credRes = await supabase.functions.invoke('update-user-credentials', {
        body: { userId: editProfile.id, nomeUsuario: newUsernameSanitized },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (credRes.error || credRes.data?.error) {
        toast({
          title: 'Erro ao atualizar login do usuário',
          description: credRes.error?.message || credRes.data?.error || 'Falha desconhecida',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }
    }

    // 2) Update profile fields (use sanitized username so it matches the login)
    const { error } = await supabase.from('profiles').update({
      nome_completo: editForm.nome_completo || '',
      nome_usuario: newUsernameSanitized,
      email: editForm.email || '',
      telefone: editForm.telefone || '',
      cpf_cnpj: editForm.cpf_cnpj || '',
    }).eq('id', editProfile.id);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // 3) Update role if changed
    if (editForm.role && editForm.role !== editProfile.role) {
      const { data: existingRole } = await supabase.from('user_roles').select('id').eq('user_id', editProfile.id).maybeSingle();
      if (existingRole) {
        await supabase.from('user_roles').update({ role: editForm.role } as any).eq('user_id', editProfile.id);
      } else {
        await supabase.from('user_roles').insert({ user_id: editProfile.id, role: editForm.role } as any);
      }
    }

    // 4) Update password if provided
    if (editForm.newPassword && editForm.newPassword.length > 0) {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await supabase.functions.invoke('update-user-password', {
        body: { userId: editProfile.id, newPassword: editForm.newPassword },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (res.error || res.data?.error) {
        toast({ title: 'Perfil salvo, mas erro ao alterar senha', description: res.error?.message || res.data?.error, variant: 'destructive' });
        setSaving(false);
        setEditProfile(null);
        fetchProfiles();
        return;
      }
    }

    toast({ title: 'Usuário atualizado com sucesso!' });
    setEditProfile(null);
    fetchProfiles();
    setSaving(false);
  };

  /* ── Delete user ── */
  const handleDelete = async () => {
    if (!deleteProfile) return;
    setDeleting(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await supabase.functions.invoke('delete-user', {
      body: { userId: deleteProfile.id },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (res.error) {
      toast({ title: 'Erro ao excluir', description: res.error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Usuário excluído com sucesso!' });
      setDeleteProfile(null);
      fetchProfiles();
    }
    setDeleting(false);
  };

  const isProtected = (username: string) => PROTECTED_USERNAMES.includes(username.toLowerCase());

  if (authLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }
  if (!isLoggedIn || !isAdmin) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Users size={24} />
            Gerenciamento de Usuários
          </CardTitle>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus size={16} />
            Criar Usuário
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                 <TableHead>Nome Completo</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nome_completo || '—'}</TableCell>
                    <TableCell>{p.nome_usuario}</TableCell>
                    <TableCell>
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-muted">
                        {ROLE_OPTIONS.find(r => r.value === p.role)?.label || p.role || '—'}
                      </span>
                    </TableCell>
                    <TableCell>{p.email || '—'}</TableCell>
                    <TableCell>{p.cpf_cnpj || '—'}</TableCell>
                    <TableCell>{new Date(p.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                        <Pencil size={14} />
                      </Button>
                      {user?.role === 'admin_master' && !isProtected(p.nome_usuario) && (
                        <Button size="sm" variant="destructive" onClick={() => setDeleteProfile(p)}>
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {profiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum usuário cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>Preencha os dados do novo usuário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome Completo</Label>
              <Input value={createForm.nomeCompleto} onChange={(e) => setCreateForm({ ...createForm, nomeCompleto: e.target.value })} placeholder="Nome completo" />
            </div>
            <div>
              <Label>Nome de Usuário (login) *</Label>
              <Input value={createForm.nomeUsuario} onChange={(e) => setCreateForm({ ...createForm, nomeUsuario: e.target.value })} placeholder="Nome de usuário" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="Email de contato" />
            </div>
            <div>
              <Label>CPF/CNPJ</Label>
              <Input value={createForm.cpfCnpj} onChange={(e) => setCreateForm({ ...createForm, cpfCnpj: e.target.value })} placeholder="CPF ou CNPJ" />
            </div>
            <div>
              <Label>Senha *</Label>
              <Input type="password" value={createForm.senha} onChange={(e) => setCreateForm({ ...createForm, senha: e.target.value })} placeholder="Senha do usuário" />
            </div>
            <div>
              <Label>Papel (Role)</Label>
              <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editProfile} onOpenChange={() => setEditProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário: {editProfile?.nome_usuario}</DialogTitle>
            <DialogDescription>Altere os dados do usuário abaixo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome Completo</Label>
              <Input value={editForm.nome_completo || ''} onChange={(e) => setEditForm({ ...editForm, nome_completo: e.target.value })} />
            </div>
            <div>
              <Label>Nome de Usuário (login)</Label>
              <Input value={editForm.nome_usuario || ''} onChange={(e) => setEditForm({ ...editForm, nome_usuario: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={editForm.telefone || ''} onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })} />
            </div>
            <div>
              <Label>CPF/CNPJ</Label>
              <Input value={editForm.cpf_cnpj || ''} onChange={(e) => setEditForm({ ...editForm, cpf_cnpj: e.target.value })} />
            </div>
            <div>
              <Label>Nova Senha (deixe vazio para manter a atual)</Label>
              <Input type="password" value={editForm.newPassword || ''} onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })} placeholder="Nova senha" />
            </div>
            <div>
              <Label>Papel (Role)</Label>
              <Select value={editForm.role || 'vendedor'} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProfile(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteProfile} onOpenChange={() => setDeleteProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{deleteProfile?.nome_usuario}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProfile(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagementPage;
