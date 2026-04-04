import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'; // v5-session-fix
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

/* ───── Types (unchanged) ───── */
export interface User {
  id: string;
  nomeCompleto: string;
  nomeUsuario: string;
  telefone: string;
  email: string;
  cpfCnpj: string;
  isAdmin?: boolean;
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

export const PRODUCTION_STATUSES = [
  "Em aberto", "Aguardando", "Emprestado", "Corte", "Sem bordado",
  "Bordado Dinei", "Bordado Sandro", "Bordado 7Estrivos",
  "Pesponto 01", "Pesponto 02", "Pesponto 03", "Pesponto 04", "Pesponto 05",
  "Pespontando", "Montagem", "Revisão", "Expedição",
  "Baixa Estoque", "Baixa Site (Despachado)",
  "Entregue", "Cobrado", "Pago"
];

export const EXTRAS_STATUSES = [
  "Em aberto", "Produzindo", "Expedição", "Entregue", "Cobrado", "Pago"
];

export const BELT_STATUSES = [
  "Em aberto", "Corte", "Bordado", "Pesponto",
  "Expedição", "Entregue", "Cobrado", "Pago"
];

export const PRODUCTION_STATUSES_USER = [
  "Em aberto", "Aguardando", "Emprestado", "Corte", "Sem bordado",
  "Bordado Dinei", "Bordado Sandro", "Bordado 7Estrivos",
  "Pesponto 01", "Pesponto 02", "Pesponto 03", "Pesponto 04", "Pesponto 05",
  "Pespontando", "Montagem", "Revisão", "Expedição",
  "Entregue", "Cobrado", "Pago"
];

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
  if (!digits) return ''; // avoid 0000000000 collision
  return digits.padStart(10, '0');
}

/** Generate a unique barcode value from the order's UUID id.
 *  Extracts hex digits and pads to 12 chars — always unique per order. */
export function orderBarcodeValue(idOrNumero: string, orderId?: string): string {
  const id = orderId ?? idOrNumero;
  // Use the UUID hex digits (strip dashes) → take last 12 for a compact unique code
  const hex = id.replace(/-/g, '');
  if (hex.length >= 12) return hex.slice(-12).toUpperCase();
  // Fallback: if somehow not a UUID, use legacy
  return orderBarcodeValueLegacy(idOrNumero) || hex.padStart(12, '0').toUpperCase();
}

/** Centralized barcode/scan matcher. Checks new barcode, legacy barcode, and raw numero. */
export function matchOrderBarcode(scannedCode: string, order: { id: string; numero: string }): boolean {
  if (!scannedCode) return false;
  const code = scannedCode.trim();
  // Match by new unique barcode (based on id)
  if (code === orderBarcodeValue(order.numero, order.id)) return true;
  // Match by raw order numero
  if (code === order.numero) return true;
  // Match by legacy barcode (digits of numero)
  const legacy = orderBarcodeValueLegacy(order.numero);
  if (legacy && code === legacy) return true;
  // Match digits-only input against digits of numero (only if both have digits)
  const codeDigits = code.replace(/\D/g, '');
  const numDigits = order.numero.replace(/\D/g, '');
  if (codeDigits && numDigits && codeDigits === numDigits) return true;
  return false;
}

/* ───── DB row → Order mapping ───── */
function dbRowToOrder(row: any): Order {
  return {
    id: row.id,
    numero: row.numero,
    vendedor: row.vendedor,
    tamanho: row.tamanho,
    genero: row.genero || undefined,
    modelo: row.modelo,
    solado: row.solado,
    formatoBico: row.formato_bico,
    corVira: row.cor_vira,
    couroGaspea: row.couro_gaspea,
    couroCano: row.couro_cano,
    couroTaloneira: row.couro_taloneira,
    corCouroGaspea: row.cor_couro_gaspea || undefined,
    corCouroCano: row.cor_couro_cano || undefined,
    corCouroTaloneira: row.cor_couro_taloneira || undefined,
    bordadoCano: row.bordado_cano,
    bordadoGaspea: row.bordado_gaspea,
    bordadoTaloneira: row.bordado_taloneira,
    corBordadoCano: row.cor_bordado_cano || undefined,
    corBordadoGaspea: row.cor_bordado_gaspea || undefined,
    corBordadoTaloneira: row.cor_bordado_taloneira || undefined,
    bordadoVariadoDescCano: row.bordado_variado_desc_cano || undefined,
    bordadoVariadoDescGaspea: row.bordado_variado_desc_gaspea || undefined,
    bordadoVariadoDescTaloneira: row.bordado_variado_desc_taloneira || undefined,
    personalizacaoNome: row.personalizacao_nome,
    personalizacaoBordado: row.personalizacao_bordado,
    nomeBordadoDesc: row.nome_bordado_desc || undefined,
    corLinha: row.cor_linha,
    corBorrachinha: row.cor_borrachinha,
    trisce: row.trisce,
    triceDesc: row.trice_desc || undefined,
    tiras: row.tiras,
    tirasDesc: row.tiras_desc || undefined,
    metais: row.metais,
    tipoMetal: row.tipo_metal || undefined,
    corMetal: row.cor_metal || undefined,
    strassQtd: row.strass_qtd ?? undefined,
    cruzMetalQtd: row.cruz_metal_qtd ?? undefined,
    bridaoMetalQtd: row.bridao_metal_qtd ?? undefined,
    acessorios: row.acessorios,
    desenvolvimento: row.desenvolvimento,
    sobMedida: row.sob_medida,
    sobMedidaDesc: row.sob_medida_desc || undefined,
    observacao: row.observacao,
    quantidade: row.quantidade,
    preco: Number(row.preco),
    status: row.status,
    dataCriacao: row.data_criacao,
    horaCriacao: row.hora_criacao,
    diasRestantes: row.dias_restantes,
    temLaser: row.tem_laser,
    fotos: (row.fotos as string[]) || [],
    historico: (row.historico as any[]) || [],
    alteracoes: (row.alteracoes as any[]) || [],
    laserCano: row.laser_cano || undefined,
    corGlitterCano: row.cor_glitter_cano || undefined,
    laserGaspea: row.laser_gaspea || undefined,
    corGlitterGaspea: row.cor_glitter_gaspea || undefined,
    laserTaloneira: row.laser_taloneira || undefined,
    corGlitterTaloneira: row.cor_glitter_taloneira || undefined,
    estampa: row.estampa || undefined,
    estampaDesc: row.estampa_desc || undefined,
    pintura: row.pintura || undefined,
    pinturaDesc: row.pintura_desc || undefined,
    costuraAtras: row.costura_atras || undefined,
    corSola: row.cor_sola || undefined,
    carimbo: row.carimbo || undefined,
    carimboDesc: row.carimbo_desc || undefined,
    corVivo: row.cor_vivo || undefined,
    adicionalDesc: row.adicional_desc || undefined,
    adicionalValor: row.adicional_valor != null ? Number(row.adicional_valor) : undefined,
    desconto: row.desconto != null ? Number(row.desconto) : undefined,
    descontoJustificativa: row.desconto_justificativa || undefined,
    forma: row.forma || undefined,
    tipoExtra: row.tipo_extra || undefined,
    extraDetalhes: row.extra_detalhes || undefined,
    numeroPedidoBota: row.numero_pedido_bota || undefined,
    cliente: row.cliente || '',
  };
}

/* ───── Order → DB row mapping ───── */
function orderToDbRow(order: any, userId: string) {
  return {
    user_id: userId,
    numero: order.numero,
    vendedor: order.vendedor || '',
    tamanho: order.tamanho || '',
    genero: order.genero || null,
    modelo: order.modelo || '',
    solado: order.solado || '',
    formato_bico: order.formatoBico || '',
    cor_vira: order.corVira || '',
    couro_gaspea: order.couroGaspea || '',
    couro_cano: order.couroCano || '',
    couro_taloneira: order.couroTaloneira || '',
    cor_couro_gaspea: order.corCouroGaspea || null,
    cor_couro_cano: order.corCouroCano || null,
    cor_couro_taloneira: order.corCouroTaloneira || null,
    bordado_cano: order.bordadoCano || '',
    bordado_gaspea: order.bordadoGaspea || '',
    bordado_taloneira: order.bordadoTaloneira || '',
    cor_bordado_cano: order.corBordadoCano || null,
    cor_bordado_gaspea: order.corBordadoGaspea || null,
    cor_bordado_taloneira: order.corBordadoTaloneira || null,
    bordado_variado_desc_cano: order.bordadoVariadoDescCano || null,
    bordado_variado_desc_gaspea: order.bordadoVariadoDescGaspea || null,
    bordado_variado_desc_taloneira: order.bordadoVariadoDescTaloneira || null,
    personalizacao_nome: order.personalizacaoNome || '',
    personalizacao_bordado: order.personalizacaoBordado || '',
    nome_bordado_desc: order.nomeBordadoDesc || null,
    cor_linha: order.corLinha || '',
    cor_borrachinha: order.corBorrachinha || '',
    trisce: order.trisce || 'Não',
    trice_desc: order.triceDesc || null,
    tiras: order.tiras || 'Não',
    tiras_desc: order.tirasDesc || null,
    metais: order.metais || '',
    tipo_metal: order.tipoMetal || null,
    cor_metal: order.corMetal || null,
    strass_qtd: order.strassQtd ?? null,
    cruz_metal_qtd: order.cruzMetalQtd ?? null,
    bridao_metal_qtd: order.bridaoMetalQtd ?? null,
    acessorios: order.acessorios || '',
    desenvolvimento: order.desenvolvimento || '',
    sob_medida: order.sobMedida ?? false,
    sob_medida_desc: order.sobMedidaDesc || null,
    observacao: order.observacao || '',
    quantidade: order.quantidade ?? 1,
    preco: order.preco ?? 0,
    status: order.status || 'Em aberto',
    data_criacao: order.dataCriacao,
    hora_criacao: order.horaCriacao,
    dias_restantes: order.diasRestantes ?? 10,
    tem_laser: order.temLaser ?? false,
    fotos: order.fotos || [],
    historico: order.historico || [],
    alteracoes: order.alteracoes || [],
    laser_cano: order.laserCano || null,
    cor_glitter_cano: order.corGlitterCano || null,
    laser_gaspea: order.laserGaspea || null,
    cor_glitter_gaspea: order.corGlitterGaspea || null,
    laser_taloneira: order.laserTaloneira || null,
    cor_glitter_taloneira: order.corGlitterTaloneira || null,
    estampa: order.estampa || null,
    estampa_desc: order.estampaDesc || null,
    pintura: order.pintura || null,
    pintura_desc: order.pinturaDesc || null,
    costura_atras: order.costuraAtras || null,
    cor_sola: order.corSola || null,
    carimbo: order.carimbo || null,
    carimbo_desc: order.carimboDesc || null,
    cor_vivo: order.corVivo || null,
    adicional_desc: order.adicionalDesc || null,
    adicional_valor: order.adicionalValor ?? null,
    desconto: order.desconto ?? null,
    desconto_justificativa: order.descontoJustificativa || null,
    forma: order.forma || null,
    tipo_extra: order.tipoExtra || null,
    extra_detalhes: order.extraDetalhes || null,
    numero_pedido_bota: order.numeroPedidoBota || null,
    cliente: order.cliente || '',
  };
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
  login: (username: string, password: string) => Promise<'ok' | 'error'>;
  register: (data: Omit<User, 'id' | 'isAdmin'> & { senha: string }) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<Omit<User, 'id' | 'isAdmin'>>) => void;
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'numero' | 'dataCriacao' | 'horaCriacao' | 'diasRestantes' | 'historico' | 'status' | 'alteracoes'> & { numeroPedido?: string }) => Promise<boolean>;
  addOrderBatch: (orderData: Omit<Order, 'id' | 'numero' | 'dataCriacao' | 'horaCriacao' | 'diasRestantes' | 'historico' | 'status' | 'alteracoes' | 'tamanho'>, gradeItems: { tamanho: string; quantidade: number }[], numeroPedidoBase: string) => Promise<boolean>;
  deleteOrder: (id: string) => void;
  updateOrder: (id: string, data: Partial<Order>) => void;
  updateOrderStatus: (id: string, newStatus: string, observacao?: string) => void;
  isFernanda: boolean;
  recoverPassword: (cpfCnpj: string, digits: string) => Promise<boolean>;
  allOrders: Order[];
  loading: boolean;
  allProfiles: ProfileSummary[];
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [allProfiles, setAllProfiles] = useState<ProfileSummary[]>([]);

  const isFernanda = user?.nomeUsuario?.toLowerCase() === 'fernanda';

  /* ───── Load profile from DB ───── */
  const loadProfile = useCallback(async (authUserId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUserId)
      .single();

    if (!profile) return null;

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', authUserId);

    const hasAdmin = roles?.some((r: any) => r.role === 'admin') ?? false;

    const u: User = {
      id: authUserId,
      nomeCompleto: profile.nome_completo,
      nomeUsuario: profile.nome_usuario,
      telefone: profile.telefone,
      email: profile.email,
      cpfCnpj: profile.cpf_cnpj,
      isAdmin: hasAdmin,
    };

    setUser(u);
    setIsAdmin(hasAdmin);
    return u;
  }, []);

  /* ───── Load orders ───── */
  const loadOrders = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setOrders([]);
      setAllOrders([]);
      return;
    }

    // RLS handles visibility: admin sees all, user sees own
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading orders:', error);
      return;
    }

    const mapped = (data || []).map(dbRowToOrder);

    if (currentUser.isAdmin) {
      setAllOrders(mapped);
      setOrders(mapped);
    } else {
      setOrders(mapped);
      setAllOrders(mapped);
    }
  }, []);

  /* ───── Auth state listener ───── */
  useEffect(() => {
    let isMounted = true;

    // 1. Restaurar sessão do storage PRIMEIRO
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        const result = await loadProfile(session.user.id);
        if (result && isMounted) await loadOrders(result);
      }
      if (isMounted) setLoading(false);
    });

    // 2. Listener para mudanças SUBSEQUENTES (login/logout)
    //    NÃO usar await — fire-and-forget
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        if (event === 'SIGNED_IN' && session?.user) {
          loadProfile(session.user.id).then(result => {
            if (result && isMounted) loadOrders(result);
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAdmin(false);
          setOrders([]);
          setAllOrders([]);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile, loadOrders]);

  /* ───── Login ───── */
  const login = useCallback(async (username: string, password: string): Promise<'ok' | 'error'> => {
    const sanitized = username.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
    const email = `${sanitized}@7estrivos.app`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? 'error' : 'ok';
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
    setOrders([]);
    setAllOrders([]);
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
    // Look up profile with matching cpf_cnpj starting with those digits
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
      if (!user) {
        console.error('addOrder: user is null');
        return false;
      }

      // Verify active session before inserting
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('addOrder: session expired');
        await logout();
        return false;
      }

      const { numeroPedido, ...rest } = orderData;
      const dataHoje = formatBrasiliaDate();
      const horaAgora = formatBrasiliaTime();
      const totalBizDays = rest.tipoExtra === 'cinto' ? 5 : rest.tipoExtra ? 1 : 15;

      // Generate order number
      const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      const numero = numeroPedido || `7E-${dataHoje.slice(0, 4)}${String((count || 0) + 1).padStart(4, '0')}`;

      // Check for duplicate order number
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

      // If admin is creating order for a different vendedor, use vendedor's user_id
      let targetUserId = user.id;
      if (isAdmin && rest.vendedor && rest.vendedor !== user.nomeCompleto) {
        // "Estoque" is a special internal vendor — keep admin's user_id
        if (rest.vendedor !== 'Estoque') {
          const { data: vendorProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('nome_completo', rest.vendedor)
            .maybeSingle();
          if (vendorProfile) {
            targetUserId = vendorProfile.id;
          }
        }
      }

      const dbRow = orderToDbRow(newOrder, targetUserId);

      const { data, error } = await supabase.from('orders').insert(dbRow).select().single();
      if (error) {
        console.error('Error adding order:', error);
        return false;
      }

      const mapped = dbRowToOrder(data);
      setOrders(prev => [mapped, ...prev]);
      setAllOrders(prev => [mapped, ...prev]);
      return true;
    } catch (err) {
      console.error('addOrder exception:', err);
      return false;
    }
  }, [user, logout]);

  /* ───── Add Order Batch (Grade de Estoque) ───── */
  const addOrderBatch = useCallback(async (
    orderData: Omit<Order, 'id' | 'numero' | 'dataCriacao' | 'horaCriacao' | 'diasRestantes' | 'historico' | 'status' | 'alteracoes' | 'tamanho'>,
    gradeItems: { tamanho: string; quantidade: number }[],
    numeroPedidoBase: string,
  ): Promise<boolean> => {
    try {
      if (!user) return false;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { await logout(); return false; }

      // Sort by size ascending
      const sorted = [...gradeItems].sort((a, b) => Number(a.tamanho) - Number(b.tamanho));

      // Build all order numbers: base + tamanho + seq (2 digits)
      // E.g. base "E001" + size "35" + seq "01" = "E0013501"
      const numbers: { tamanho: string; numero: string }[] = [];
      for (const item of sorted) {
        for (let i = 0; i < item.quantidade; i++) {
          const seq = String(i + 1).padStart(2, '0');
          numbers.push({ tamanho: item.tamanho, numero: `${numeroPedidoBase}${item.tamanho}${seq}` });
        }
      }

      // Check ALL numbers for duplicates in one query
      const allNums = numbers.map(n => n.numero);
      const { data: existing } = await supabase.from('orders').select('numero').in('numero', allNums);
      if (existing && existing.length > 0) {
        const dupes = existing.map(e => e.numero).join(', ');
        toast.error(`Números já existentes: ${dupes}`);
        return false;
      }

      const dataHoje = formatBrasiliaDate();
      const horaAgora = formatBrasiliaTime();

      // Estoque always uses admin's user_id
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

      const { data, error } = await supabase.from('orders').insert(rows).select();
      if (error) {
        console.error('Error adding batch orders:', error);
        toast.error('Erro ao gerar grade de pedidos.');
        return false;
      }

      const mapped = (data || []).map(dbRowToOrder);
      setOrders(prev => [...mapped, ...prev]);
      setAllOrders(prev => [...mapped, ...prev]);
      return true;
    } catch (err) {
      console.error('addOrderBatch exception:', err);
      toast.error('Erro inesperado ao gerar grade.');
      return false;
    }
  }, [user, logout]);

  /* ───── Delete Order ───── */
  const deleteOrder = useCallback(async (id: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) {
      console.error('Error deleting order:', error);
      return;
    }
    setOrders(prev => prev.filter(o => o.id !== id));
    setAllOrders(prev => prev.filter(o => o.id !== id));
  }, []);

  /* ───── Update Order ───── */
  const updateOrder = useCallback(async (id: string, data: Partial<Order>) => {
    const dataHoje = formatBrasiliaDate();
    const horaAgora = formatBrasiliaTime();

    // Find current order in local state for change tracking
    const current = [...orders, ...allOrders].find(o => o.id === id);
    if (!current) return;

    // Build change descriptions
    const changes: OrderAlteracao[] = [];
    const fieldLabels: Record<string, string> = {
      modelo: 'Modelo', tamanho: 'Tamanho', genero: 'Gênero', solado: 'Solado',
      couroCano: 'Couro do Cano', couroGaspea: 'Couro da Gáspea', couroTaloneira: 'Couro da Taloneira',
      corCouroCano: 'Cor Couro Cano', corCouroGaspea: 'Cor Couro Gáspea', corCouroTaloneira: 'Cor Couro Taloneira',
      bordadoCano: 'Bordado Cano', bordadoGaspea: 'Bordado Gáspea', bordadoTaloneira: 'Bordado Taloneira',
      corBordadoCano: 'Cor Bordado Cano', corBordadoGaspea: 'Cor Bordado Gáspea', corBordadoTaloneira: 'Cor Bordado Taloneira',
      nomeBordadoDesc: 'Nome Bordado', laserCano: 'Laser Cano', laserGaspea: 'Laser Gáspea',
      laserTaloneira: 'Laser Taloneira', corGlitterCano: 'Glitter Cano', corGlitterGaspea: 'Glitter Gáspea',
      corGlitterTaloneira: 'Glitter Taloneira', pintura: 'Pintura', pinturaDesc: 'Cor Pintura',
      estampa: 'Estampa', estampaDesc: 'Descrição Estampa', corLinha: 'Cor da Linha',
      corBorrachinha: 'Cor Borrachinha', corVivo: 'Cor do Vivo', metais: 'Área Metal',
      tipoMetal: 'Tipo Metal', corMetal: 'Cor Metal', observacao: 'Observação',
      desenvolvimento: 'Desenvolvimento', acessorios: 'Acessórios', corVira: 'Cor Vira',
      corSola: 'Cor Sola', costuraAtras: 'Costura Atrás', carimbo: 'Carimbo',
      carimboDesc: 'Descrição Carimbo', adicionalDesc: 'Adicional', formatoBico: 'Formato Bico',
      preco: 'Valor total', desconto: 'Desconto', descontoJustificativa: 'Justificativa do Desconto',
      vendedor: 'Vendedor',
    };

    for (const key of Object.keys(data)) {
      if (key === 'historico' || key === 'alteracoes') continue;
      const oldVal = String((current as any)[key] ?? '');
      const newVal = String((data as any)[key] ?? '');
      if (oldVal !== newVal) {
        const label = fieldLabels[key] || key;
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

    const updatedOrder = { ...current, ...data, alteracoes: [...(current.alteracoes || []), ...changes] };

    // If vendedor changed, update user_id to the new vendedor's profile
    let newUserId: string | undefined;
    if (data.vendedor && data.vendedor !== current.vendedor) {
      if (data.vendedor === 'Estoque') {
        // Estoque uses current admin's user_id
        const { data: { session } } = await supabase.auth.getSession();
        newUserId = session?.user?.id;
      } else {
        const { data: vendorProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('nome_completo', data.vendedor)
          .maybeSingle();
        if (vendorProfile) {
          newUserId = vendorProfile.id;
        }
      }
    }

    // Build DB update payload
    const dbUpdate: any = {};
    const camelToSnake: Record<string, string> = {
      formatoBico: 'formato_bico', corVira: 'cor_vira', couroGaspea: 'couro_gaspea', couroCano: 'couro_cano',
      couroTaloneira: 'couro_taloneira', corCouroGaspea: 'cor_couro_gaspea', corCouroCano: 'cor_couro_cano',
      corCouroTaloneira: 'cor_couro_taloneira', bordadoCano: 'bordado_cano', bordadoGaspea: 'bordado_gaspea',
      bordadoTaloneira: 'bordado_taloneira', corBordadoCano: 'cor_bordado_cano', corBordadoGaspea: 'cor_bordado_gaspea',
      corBordadoTaloneira: 'cor_bordado_taloneira', bordadoVariadoDescCano: 'bordado_variado_desc_cano',
      bordadoVariadoDescGaspea: 'bordado_variado_desc_gaspea', bordadoVariadoDescTaloneira: 'bordado_variado_desc_taloneira',
      personalizacaoNome: 'personalizacao_nome', personalizacaoBordado: 'personalizacao_bordado',
      nomeBordadoDesc: 'nome_bordado_desc', corLinha: 'cor_linha', corBorrachinha: 'cor_borrachinha',
      triceDesc: 'trice_desc', tirasDesc: 'tiras_desc', tipoMetal: 'tipo_metal', corMetal: 'cor_metal',
      strassQtd: 'strass_qtd', cruzMetalQtd: 'cruz_metal_qtd', bridaoMetalQtd: 'bridao_metal_qtd',
      sobMedida: 'sob_medida', sobMedidaDesc: 'sob_medida_desc', dataCriacao: 'data_criacao',
      horaCriacao: 'hora_criacao', diasRestantes: 'dias_restantes', temLaser: 'tem_laser',
      laserCano: 'laser_cano', corGlitterCano: 'cor_glitter_cano', laserGaspea: 'laser_gaspea',
      corGlitterGaspea: 'cor_glitter_gaspea', laserTaloneira: 'laser_taloneira',
      corGlitterTaloneira: 'cor_glitter_taloneira', estampaDesc: 'estampa_desc', pinturaDesc: 'pintura_desc',
      costuraAtras: 'costura_atras', corSola: 'cor_sola', carimboDesc: 'carimbo_desc',
      corVivo: 'cor_vivo', adicionalDesc: 'adicional_desc', adicionalValor: 'adicional_valor',
      descontoJustificativa: 'desconto_justificativa', tipoExtra: 'tipo_extra',
      extraDetalhes: 'extra_detalhes', numeroPedidoBota: 'numero_pedido_bota',
    };

    for (const [key, val] of Object.entries(data)) {
      if (key === 'id') continue;
      const dbKey = camelToSnake[key] || key;
      dbUpdate[dbKey] = val ?? null;
    }

    // Always update alteracoes
    dbUpdate.alteracoes = updatedOrder.alteracoes;

    // Update user_id if vendedor changed
    if (newUserId) {
      dbUpdate.user_id = newUserId;
    }

    const { error } = await supabase.from('orders').update(dbUpdate).eq('id', id);
    if (error) {
      console.error('Error updating order:', error);
      return;
    }

    setOrders(prev => prev.map(o => o.id === id ? updatedOrder : o));
    setAllOrders(prev => prev.map(o => o.id === id ? updatedOrder : o));
  }, [orders, allOrders]);

  /* ───── Update Order Status ───── */
  const updateOrderStatus = useCallback(async (id: string, newStatus: string, observacao?: string) => {
    const dataHoje = formatBrasiliaDate();
    const horaAgora = formatBrasiliaTime();

    const current = [...orders, ...allOrders].find(o => o.id === id);
    if (!current) return;

    const newHistEntry = { data: dataHoje, hora: horaAgora, local: newStatus, descricao: `Pedido movido para ${newStatus}`, observacao: observacao || undefined };
    const updatedHistorico = [...current.historico, newHistEntry];

    const { error } = await supabase.from('orders').update({
      status: newStatus,
      historico: updatedHistorico as any,
    }).eq('id', id);

    if (error) {
      console.error('Error updating status:', error);
      return;
    }

    const updatedOrder = { ...current, status: newStatus, historico: updatedHistorico };
    setOrders(prev => prev.map(o => o.id === id ? updatedOrder : o));
    setAllOrders(prev => prev.map(o => o.id === id ? updatedOrder : o));
  }, [orders, allOrders]);

  /* ───── Load all profiles for ADM vendor selection ───── */
  const loadAllProfiles = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, nome_completo, nome_usuario');
    if (data) {
      setAllProfiles(data.map(p => ({ id: p.id, nomeCompleto: p.nome_completo, nomeUsuario: p.nome_usuario })));
    }
  }, []);

  // Load profiles when admin logs in
  useEffect(() => {
    if (isAdmin) loadAllProfiles();
  }, [isAdmin, loadAllProfiles]);

  const userOrders = isAdmin ? orders : orders;

  return (
    <AuthContext.Provider value={{
      user, isLoggedIn: !!user, isAdmin, isFernanda,
      login, register, logout, updateProfile,
      orders: userOrders, addOrder, addOrderBatch, deleteOrder, updateOrder, updateOrderStatus,
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
