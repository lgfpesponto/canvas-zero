import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { dbRowToOrder, orderToDbRow, CAMEL_TO_SNAKE, FIELD_LABELS } from '@/lib/order-logic';

/* ───── Brasilia helpers (unchanged) ───── */
function nowBrasilia(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

export function formatBrasiliaDate(): string {
  const d = nowBrasilia();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatBrasiliaTime(): string {
  const d = nowBrasilia();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* ───── Types ───── */
export type AppRole = 'admin_master' | 'admin_producao' | 'vendedor' | 'vendedor_comissao' | 'admin' | 'user';

export interface User {
  id: string;
  nomeCompleto: string;
  nomeUsuario: string;
  telefone: string;
  email: string;
  cpfCnpj: string;
  isAdmin?: boolean;
  role?: AppRole;
}

export interface OrderAlteracao {
  data: string;
  hora: string;
  descricao: string;
}

export interface Order {
  id: string;
  numero: string;
  vendedor: string;
  tamanho: string;
  genero?: string;
  modelo: string;
  solado: string;
  formatoBico: string;
  corVira: string;
  couroGaspea: string;
  couroCano: string;
  couroTaloneira: string;
  corCouroGaspea?: string;
  corCouroCano?: string;
  corCouroTaloneira?: string;
  bordadoCano: string;
  bordadoGaspea: string;
  bordadoTaloneira: string;
  corBordadoCano?: string;
  corBordadoGaspea?: string;
  corBordadoTaloneira?: string;
  bordadoVariadoDescCano?: string;
  bordadoVariadoDescGaspea?: string;
  bordadoVariadoDescTaloneira?: string;
  personalizacaoNome: string;
  personalizacaoBordado: string;
  nomeBordadoDesc?: string;
  corLinha: string;
  corBorrachinha: string;
  trisce: string;
  triceDesc?: string;
  tiras: string;
  tirasDesc?: string;
  metais: string;
  tipoMetal?: string;
  corMetal?: string;
  strassQtd?: number;
  cruzMetalQtd?: number;
  bridaoMetalQtd?: number;
  acessorios: string;
  desenvolvimento: string;
  sobMedida: boolean;
  sobMedidaDesc?: string;
  observacao: string;
  quantidade: number;
  preco: number;
  status: string;
  dataCriacao: string;
  horaCriacao: string;
  diasRestantes: number;
  temLaser: boolean;
  fotos: string[];
  historico: { data: string; hora: string; local: string; descricao: string; observacao?: string }[];
  alteracoes: OrderAlteracao[];
  laserCano?: string;
  corGlitterCano?: string;
  laserGaspea?: string;
  corGlitterGaspea?: string;
  laserTaloneira?: string;
  corGlitterTaloneira?: string;
  estampa?: string;
  estampaDesc?: string;
  pintura?: string;
  pinturaDesc?: string;
  costuraAtras?: string;
  corSola?: string;
  carimbo?: string;
  carimboDesc?: string;
  corVivo?: string;
  adicionalDesc?: string;
  adicionalValor?: number;
  desconto?: number;
  descontoJustificativa?: string;
  forma?: string;
  tipoExtra?: string;
  extraDetalhes?: Record<string, any>;
  numeroPedidoBota?: string;
  cliente?: string;
}

// Re-export statuses from centralized module for backward compatibility
export { PRODUCTION_STATUSES, PRODUCTION_STATUSES_USER, EXTRAS_STATUSES, BELT_STATUSES } from '@/lib/order-logic';

/* ───── Business days helpers (unchanged) ───── */
function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

export function businessDaysRemaining(startDate: Date, totalBusinessDays: number): number {
  const deadline = addBusinessDays(startDate, totalBusinessDays);
  const now = nowBrasilia();
  if (now >= deadline) return 0;
  let count = 0;
  const d = new Date(now);
  while (d < deadline) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

/** Legacy barcode from numero (kept for scanning old printed labels) */
export function orderBarcodeValueLegacy(numero: string): string {
  const digits = numero.replace(/\D/g, '');
  if (!digits) return '';
  return digits.padStart(10, '0');
}

/** Generate a unique barcode value from the order's UUID id. */
export function orderBarcodeValue(idOrNumero: string, orderId?: string): string {
  const id = orderId ?? idOrNumero;
  const hex = id.replace(/-/g, '');
  if (hex.length >= 12) return hex.slice(-12).toUpperCase();
  return orderBarcodeValueLegacy(idOrNumero) || hex.padStart(12, '0').toUpperCase();
}

/** Centralized barcode/scan matcher. */
export function matchOrderBarcode(scannedCode: string, order: { id: string; numero: string }): boolean {
  if (!scannedCode) return false;
  const code = scannedCode.trim();
  if (code === orderBarcodeValue(order.numero, order.id)) return true;
  if (code === order.numero) return true;
  const legacy = orderBarcodeValueLegacy(order.numero);
  if (legacy && code === legacy) return true;
  const codeDigits = code.replace(/\D/g, '');
  const numDigits = order.numero.replace(/\D/g, '');
  if (codeDigits && numDigits && codeDigits === numDigits) return true;
  return false;
}

/* ───── Context interface ───── */
export interface ProfileSummary {
  id: string;
  nomeCompleto: string;
  nomeUsuario: string;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  role: AppRole | null;
  login: (username: string, password: string) => Promise<'ok' | 'invalid_credentials' | 'network' | 'timeout' | 'error'>;
  register: (data: Omit<User, 'id' | 'isAdmin'> & { senha: string }) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<Omit<User, 'id' | 'isAdmin'>>) => void;
  /** @deprecated — Use hooks (useOrders, useOrderById) instead. Kept for backward compat during migration. */
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'numero' | 'dataCriacao' | 'horaCriacao' | 'diasRestantes' | 'historico' | 'status' | 'alteracoes'> & { numeroPedido?: string }) => Promise<boolean>;
  addOrderBatch: (orderData: Omit<Order, 'id' | 'numero' | 'dataCriacao' | 'horaCriacao' | 'diasRestantes' | 'historico' | 'status' | 'alteracoes' | 'tamanho'>, gradeItems: { tamanho: string; quantidade: number }[], numeroPedidoBase: string) => Promise<boolean>;
  deleteOrder: (id: string) => void;
  deleteOrderBatch: (ids: string[]) => Promise<void>;
  updateOrder: (id: string, data: Partial<Order>) => void;
  updateOrderStatus: (id: string, newStatus: string, observacao?: string) => void;
  /** @deprecated Use role instead */
  isFernanda: boolean;
  recoverPassword: (cpfCnpj: string, digits: string) => Promise<boolean>;
  /** @deprecated — Use hooks instead */
  allOrders: Order[];
  loading: boolean;
  allProfiles: ProfileSummary[];
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  
  const orders: Order[] = [];
  const allOrders: Order[] = [];
  const [loading, setLoading] = useState(true);
  const [allProfiles, setAllProfiles] = useState<ProfileSummary[]>([]);

  const isFernanda = role === 'admin_producao';

  /* ───── Load profile from DB (never throws) ───── */
  const loadProfile = useCallback(async (authUserId: string): Promise<User | null> => {
    try {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUserId)
        .maybeSingle();

      if (profileErr) console.error('[Auth] loadProfile profile error:', profileErr.message);
      if (!profile) {
        console.warn('[Auth] No profile row for user', authUserId);
        return null;
      }

      const { data: roles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authUserId);
      if (rolesErr) console.error('[Auth] loadProfile roles error:', rolesErr.message);

      const userRole = (roles?.[0] as any)?.role as AppRole | undefined;
      const hasAdmin = ['admin_master', 'admin_producao', 'admin'].includes(userRole || '');

      const u: User = {
        id: authUserId,
        nomeCompleto: profile.nome_completo,
        nomeUsuario: profile.nome_usuario,
        telefone: profile.telefone,
        email: profile.email,
        cpfCnpj: profile.cpf_cnpj,
        isAdmin: hasAdmin,
        role: userRole,
      };

      setUser(u);
      setIsAdmin(hasAdmin);
      setRole(userRole || null);
      return u;
    } catch (e) {
      console.error('[Auth] loadProfile exception:', e);
      return null;
    }
  }, []);

  /* ───── Auth state listener (subscription FIRST, then getSession) ─────
   * IMPORTANT: loading must remain true until profile/role are fully loaded.
   * Otherwise the UI flickers as "logged out" while session is still hydrating. */
  useEffect(() => {
    let isMounted = true;
    let initialResolved = false;
    let lastLoadedUserId: string | null = null;
    let inflight: Promise<unknown> | null = null;

    const finishInitial = () => {
      if (!isMounted || initialResolved) return;
      initialResolved = true;
      setLoading(false);
    };

    const hydrate = async (userId: string) => {
      // Prevent concurrent loads for the same user
      if (lastLoadedUserId === userId && inflight) {
        await inflight;
        return;
      }
      lastLoadedUserId = userId;
      inflight = loadProfile(userId).finally(() => { inflight = null; });
      await inflight;
    };

    // 1) Register listener BEFORE getSession to avoid races
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT' || !session?.user) {
          lastLoadedUserId = null;
          setUser(null);
          setIsAdmin(false);
          setRole(null);
          finishInitial();
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
          // Fire-and-forget; never await inside the callback
          setTimeout(() => {
            if (!isMounted) return;
            hydrate(session.user.id).finally(finishInitial);
          }, 0);
        }
      }
    );

    // 2) Then restore existing session — only finish initial loading after profile is hydrated
    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        if (!isMounted) return;
        if (error) console.error('[Auth] getSession error:', error.message);
        if (session?.user) {
          await hydrate(session.user.id);
        }
        finishInitial();
      })
      .catch((e) => {
        console.error('[Auth] getSession exception:', e);
        finishInitial();
      });

    // Safety net: never leave the app stuck on "loading" forever
    const safety = setTimeout(finishInitial, 8000);

    return () => {
      isMounted = false;
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  /* ───── Username sanitization (single source of truth) ───── */
  const sanitizeUsername = (u: string) =>
    u.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  /* ───── Login (with timeout + clearer errors) ───── */
  const login = useCallback(async (username: string, password: string): Promise<'ok' | 'invalid_credentials' | 'network' | 'timeout' | 'error'> => {
    const sanitized = sanitizeUsername(username);
    if (!sanitized) {
      console.warn('[Auth] login: username vazio após sanitização');
      return 'invalid_credentials';
    }
    const email = `${sanitized}@7estrivos.app`;

    const classifyError = (err: any): 'invalid_credentials' | 'network' | 'timeout' | 'error' => {
      const msg = (err?.message || String(err || '')).toLowerCase();
      if (msg.includes('timeout')) return 'timeout';
      if (
        msg.includes('failed to fetch') ||
        msg.includes('networkerror') ||
        msg.includes('err_name_not_resolved') ||
        msg.includes('err_internet_disconnected') ||
        msg.includes('err_connection') ||
        err?.name === 'TypeError'
      ) return 'network';
      if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('invalid email')) {
        return 'invalid_credentials';
      }
      return 'invalid_credentials';
    };

    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<{ error: Error }>((resolve) =>
          setTimeout(() => resolve({ error: new Error('timeout') }), 15000)
        ),
      ]) as { error: any };
      if (result.error) {
        console.error('[Auth] login error:', result.error?.message || result.error);
        return classifyError(result.error);
      }
      return 'ok';
    } catch (e) {
      console.error('[Auth] login exception:', e);
      return classifyError(e);
    }
  }, []);

  /* ───── Register ───── */
  const register = useCallback(async (data: Omit<User, 'id' | 'isAdmin'> & { senha: string }): Promise<boolean> => {
    const sanitized = data.nomeUsuario
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
    if (!sanitized) return false;
    const email = `${sanitized}@7estrivos.app`;
    const { error } = await supabase.auth.signUp({
      email,
      password: data.senha,
      options: {
        data: {
          nome_completo: data.nomeCompleto,
          nome_usuario: data.nomeUsuario,
          telefone: data.telefone,
          email_contato: data.email,
          cpf_cnpj: data.cpfCnpj,
        },
      },
    });
    if (error) console.error('Register error:', error.message);
    return !error;
  }, []);

  /* ───── Logout ───── */
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setRole(null);
  }, []);

  /* ───── Update Profile ───── */
  const updateProfile = useCallback(async (data: Partial<Omit<User, 'id' | 'isAdmin'>>) => {
    if (!user) return;
    const updates: any = {};
    if (data.nomeCompleto !== undefined) updates.nome_completo = data.nomeCompleto;
    if (data.nomeUsuario !== undefined) updates.nome_usuario = data.nomeUsuario;
    if (data.telefone !== undefined) updates.telefone = data.telefone;
    if (data.email !== undefined) updates.email = data.email;
    if (data.cpfCnpj !== undefined) updates.cpf_cnpj = data.cpfCnpj;

    await supabase.from('profiles').update(updates).eq('id', user.id);
    setUser(prev => prev ? { ...prev, ...data } : prev);
  }, [user]);

  /* ───── Recover Password ───── */
  const recoverPassword = useCallback(async (cpfCnpj: string, digits: string): Promise<boolean> => {
    const { data } = await supabase
      .from('profiles')
      .select('cpf_cnpj')
      .like('cpf_cnpj', `${digits}%`)
      .limit(1);
    return (data && data.length > 0);
  }, []);

  /* ───── Add Order ───── */
  const addOrder = useCallback(async (orderData: Omit<Order, 'id' | 'numero' | 'dataCriacao' | 'horaCriacao' | 'diasRestantes' | 'historico' | 'status' | 'alteracoes'> & { numeroPedido?: string }): Promise<boolean> => {
    try {
      if (!user) { console.error('addOrder: user is null'); return false; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { console.error('addOrder: session expired'); await logout(); return false; }

      const { numeroPedido, ...rest } = orderData;
      const dataHoje = formatBrasiliaDate();
      const horaAgora = formatBrasiliaTime();
      const totalBizDays = rest.tipoExtra === 'cinto' ? 5 : rest.tipoExtra ? 1 : 15;

      const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      const numero = numeroPedido || `7E-${dataHoje.slice(0, 4)}${String((count || 0) + 1).padStart(4, '0')}`;

      const { data: existingOrder } = await supabase.from('orders').select('id').eq('numero', numero).maybeSingle();
      if (existingOrder) {
        toast.error('Número de pedido já cadastrado no sistema. Por favor, utilize outro número.');
        return false;
      }

      const newOrder = {
        ...rest,
        dataCriacao: dataHoje,
        horaCriacao: horaAgora,
        diasRestantes: totalBizDays,
        status: 'Em aberto',
        historico: [{ data: dataHoje, hora: horaAgora, local: 'Em aberto', descricao: 'Pedido criado' }],
        alteracoes: [],
        numero,
      };

      let targetUserId = user.id;
      if (isAdmin && rest.vendedor && rest.vendedor !== user.nomeCompleto) {
        if (rest.vendedor !== 'Estoque') {
          const { data: vendorProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('nome_completo', rest.vendedor)
            .maybeSingle();
          if (vendorProfile) targetUserId = vendorProfile.id;
        }
      }

      const dbRow = orderToDbRow(newOrder, targetUserId);
      const { error } = await supabase.from('orders').insert(dbRow).select().single();
      if (error) { console.error('Error adding order:', error); return false; }
      return true;
    } catch (err) {
      console.error('addOrder exception:', err);
      return false;
    }
  }, [user, logout, isAdmin]);

  /* ───── Add Order Batch ───── */
  const addOrderBatch = useCallback(async (
    orderData: Omit<Order, 'id' | 'numero' | 'dataCriacao' | 'horaCriacao' | 'diasRestantes' | 'historico' | 'status' | 'alteracoes' | 'tamanho'>,
    gradeItems: { tamanho: string; quantidade: number }[],
    numeroPedidoBase: string,
  ): Promise<boolean> => {
    try {
      if (!user) return false;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { await logout(); return false; }

      const sorted = [...gradeItems].sort((a, b) => Number(a.tamanho) - Number(b.tamanho));
      const numbers: { tamanho: string; numero: string }[] = [];
      for (const item of sorted) {
        for (let i = 0; i < item.quantidade; i++) {
          const seq = String(i + 1).padStart(2, '0');
          numbers.push({ tamanho: item.tamanho, numero: `${numeroPedidoBase}${item.tamanho}${seq}` });
        }
      }

      const allNums = numbers.map(n => n.numero);
      const { data: existing } = await supabase.from('orders').select('numero').in('numero', allNums);
      if (existing && existing.length > 0) {
        const dupes = existing.map(e => e.numero).join(', ');
        toast.error(`Números já existentes: ${dupes}`);
        return false;
      }

      const dataHoje = formatBrasiliaDate();
      const horaAgora = formatBrasiliaTime();
      const targetUserId = user.id;

      const rows = numbers.map(({ tamanho, numero }) => {
        const newOrder = {
          ...orderData,
          tamanho,
          dataCriacao: dataHoje,
          horaCriacao: horaAgora,
          diasRestantes: 15,
          status: 'Em aberto',
          historico: [{ data: dataHoje, hora: horaAgora, local: 'Em aberto', descricao: 'Pedido criado (grade)' }],
          alteracoes: [],
          numero,
        };
        return orderToDbRow(newOrder, targetUserId);
      });

      const { error } = await supabase.from('orders').insert(rows).select();
      if (error) { console.error('Error adding batch orders:', error); toast.error('Erro ao gerar grade de pedidos.'); return false; }
      return true;
    } catch (err) {
      console.error('addOrderBatch exception:', err);
      toast.error('Erro inesperado ao gerar grade.');
      return false;
    }
  }, [user, logout]);

  /* ───── Delete Order ───── */
  const deleteOrder = useCallback(async (id: string) => {
    try {
      const { data: orderData } = await supabase.from('orders').select('*').eq('id', id).single();
      if (orderData) {
        await supabase.from('deleted_orders').insert({
          order_id: id,
          order_data: orderData as any,
          deleted_by: user?.id || null,
        } as any);
      }
    } catch (e) { console.error('Error archiving order:', e); }

    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) { console.error('Error deleting order:', error); }
  }, [user]);

  /* ───── Delete Order Batch ───── */
  const deleteOrderBatch = useCallback(async (ids: string[]) => {
    try {
      const { data: ordersData } = await supabase.from('orders').select('*').in('id', ids);
      if (ordersData && ordersData.length > 0) {
        const archiveRows = ordersData.map(o => ({
          order_id: o.id,
          order_data: o as any,
          deleted_by: user?.id || null,
        }));
        await supabase.from('deleted_orders').insert(archiveRows as any);
      }
    } catch (e) { console.error('Error archiving orders:', e); }

    const { error } = await supabase.from('orders').delete().in('id', ids);
    if (error) { console.error('Error deleting orders batch:', error); toast.error('Erro ao excluir pedidos'); }
  }, [user]);

  /* ───── Update Order ───── */
  const updateOrder = useCallback(async (id: string, data: Partial<Order>) => {
    const dataHoje = formatBrasiliaDate();
    const horaAgora = formatBrasiliaTime();

    const { data: currentRow } = await supabase.from('orders').select('*').eq('id', id).single();
    if (!currentRow) return;
    const current = dbRowToOrder(currentRow);

    const changes: OrderAlteracao[] = [];
    for (const key of Object.keys(data)) {
      if (key === 'historico' || key === 'alteracoes') continue;
      const oldVal = String((current as any)[key] ?? '');
      const newVal = String((data as any)[key] ?? '');
      if (oldVal !== newVal) {
        const label = FIELD_LABELS[key] || key;
        if (oldVal && newVal) {
          changes.push({ data: dataHoje, hora: horaAgora, descricao: `Alterado ${label} de "${oldVal}" para "${newVal}"` });
        } else if (newVal) {
          changes.push({ data: dataHoje, hora: horaAgora, descricao: `Adicionado ${label}: "${newVal}"` });
        } else {
          changes.push({ data: dataHoje, hora: horaAgora, descricao: `Removido ${label}` });
        }
      }
    }

    if (data.fotos && JSON.stringify(data.fotos) !== JSON.stringify(current.fotos)) {
      changes.push({ data: dataHoje, hora: horaAgora, descricao: 'Foto de referência alterada' });
    }

    const updatedAlteracoes = [...(current.alteracoes || []), ...changes];

    let newUserId: string | undefined;
    if (data.vendedor && data.vendedor !== current.vendedor) {
      if (data.vendedor === 'Estoque') {
        const { data: { session } } = await supabase.auth.getSession();
        newUserId = session?.user?.id;
      } else {
        const { data: vendorProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('nome_completo', data.vendedor)
          .maybeSingle();
        if (vendorProfile) newUserId = vendorProfile.id;
      }
    }

    const dbUpdate: any = {};
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id') continue;
      const dbKey = CAMEL_TO_SNAKE[key] || key;
      dbUpdate[dbKey] = val ?? null;
    }
    dbUpdate.alteracoes = updatedAlteracoes;
    if (newUserId) dbUpdate.user_id = newUserId;

    const { error } = await supabase.from('orders').update(dbUpdate).eq('id', id);
    if (error) { console.error('Error updating order:', error); }
  }, []);

  /* ───── Update Order Status ───── */
  const updateOrderStatus = useCallback(async (id: string, newStatus: string, observacao?: string) => {
    const dataHoje = formatBrasiliaDate();
    const horaAgora = formatBrasiliaTime();

    const { data: currentRow } = await supabase.from('orders').select('historico').eq('id', id).single();
    if (!currentRow) return;

    const currentHistorico = (currentRow.historico as any[]) || [];
    const newHistEntry = { data: dataHoje, hora: horaAgora, local: newStatus, descricao: `Pedido movido para ${newStatus}`, observacao: observacao || undefined };
    const updatedHistorico = [...currentHistorico, newHistEntry];

    const { error } = await supabase.from('orders').update({
      status: newStatus,
      historico: updatedHistorico as any,
    }).eq('id', id);

    if (error) { console.error('Error updating status:', error); }
  }, []);

  /* ───── Load all profiles for ADM vendor selection ───── */
  const loadAllProfiles = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, nome_completo, nome_usuario');
    if (data) {
      setAllProfiles(data.map(p => ({ id: p.id, nomeCompleto: p.nome_completo, nomeUsuario: p.nome_usuario })));
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadAllProfiles();
  }, [isAdmin, loadAllProfiles]);

  return (
    <AuthContext.Provider value={{
      user, isLoggedIn: !!user, isAdmin, role, isFernanda,
      login, register, logout, updateProfile,
      orders, addOrder, addOrderBatch, deleteOrder, deleteOrderBatch, updateOrder, updateOrderStatus,
      recoverPassword, allOrders, loading, allProfiles,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
