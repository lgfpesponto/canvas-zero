import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, DollarSign, AlertTriangle, AlignStartVertical, Eye, Check, ChevronDown, RotateCcw, Trash2, HardDrive, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SpecializedReports from '@/components/SpecializedReports';
import SoladoBoard from '@/components/SoladoBoard';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useState } from 'react';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } })
};

interface AdminDashboardProps {
  sourceOrders: any[];
  user: any;
  vendedores: string[];
  chartPeriod: 'dia' | 'semana' | 'mes' | 'ano';
  setChartPeriod: (p: 'dia' | 'semana' | 'mes' | 'ano') => void;
  receberVendedor: string;
  setReceberVendedor: (v: string) => void;
  chartProductFilter: string;
  setChartProductFilter: (v: string) => void;
  chartVendedorFilter: string;
  setChartVendedorFilter: (v: string) => void;
  prodProductFilter: Set<string>;
  setProdProductFilter: React.Dispatch<React.SetStateAction<Set<string>>>;
  prodVendedorFilter: Set<string>;
  setProdVendedorFilter: React.Dispatch<React.SetStateAction<Set<string>>>;
  financialData: { aReceber: number };
  chartData: { name: string; vendas: number }[];
  PROD_PRODUCT_OPTIONS: { value: string; label: string }[];
  produtosProducao: number;
  totalProducao: number;
  checkedAlertIds: Set<string>;
  handleChecked: (orderId: string) => void;
  deletedOrders: any[];
  handleRestoreOrder: (d: any) => void;
  handleDismissDeleted: (id: string) => void;
  solaCouroOrders: any[];
  solaRusticaOrders: any[];
  viraColoridaOrders: any[];
  storageInfo: { db_size_mb: number; order_count: number; deleted_order_count: number; limit_mb: number } | null;
  cleanupLoading: boolean;
  handleCleanup: () => void;
  isJuliana: boolean;
  formatCurrency: (v: number) => string;
}

const AdminDashboard = ({
  sourceOrders, user, vendedores,
  chartPeriod, setChartPeriod,
  receberVendedor, setReceberVendedor,
  chartProductFilter, setChartProductFilter,
  chartVendedorFilter, setChartVendedorFilter,
  prodProductFilter, setProdProductFilter,
  prodVendedorFilter, setProdVendedorFilter,
  financialData, chartData, PROD_PRODUCT_OPTIONS,
  produtosProducao, totalProducao,
  checkedAlertIds, handleChecked,
  deletedOrders, handleRestoreOrder, handleDismissDeleted,
  solaCouroOrders, solaRusticaOrders, viraColoridaOrders,
  storageInfo, cleanupLoading, handleCleanup,
  isJuliana, formatCurrency
}: AdminDashboardProps) => {
  const [viewingDeletedOrder, setViewingDeletedOrder] = useState<any | null>(null);

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left column */}
        <div className="space-y-6">
          {/* Sales chart */}
          <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={0} className="bg-card rounded-xl p-6 western-shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <BarChart3 className="text-primary" size={22} /> Quantidade de vendas
              </h2>
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['dia', 'semana', 'mes', 'ano'] as const).map((p) =>
                <button key={p} onClick={() => setChartPeriod(p)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${chartPeriod === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/10'}`}>
                  {p === 'mes' ? 'M\u00EAs' : p}
                </button>
              )}
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              <Select value={chartProductFilter} onValueChange={setChartProductFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todos produtos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos produtos</SelectItem>
                  <SelectItem value="bota">Bota</SelectItem>
                  <SelectItem value="regata">Regata</SelectItem>
                  <SelectItem value="bota_pronta_entrega">Bota P.E.</SelectItem>
                </SelectContent>
              </Select>
              <Select value={chartVendedorFilter} onValueChange={setChartVendedorFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos vendedores</SelectItem>
                  {vendedores.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30 20% 80%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(20 10% 40%)' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(20 10% 40%)' }} />
                  <Tooltip formatter={(v: number) => [v, 'Vendas']} />
                  <Line type="monotone" dataKey="vendas" stroke="hsl(25 85% 48%)" strokeWidth={3} dot={{ fill: 'hsl(25 85% 48%)', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* A receber */}
          <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={0} className="bg-card rounded-xl p-6 western-shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <DollarSign className="text-primary" size={22} /> A receber
              </h2>
              <Select value={receberVendedor} onValueChange={setReceberVendedor}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos vendedores</SelectItem>
                  {vendedores.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Valor a Receber</p>
              <p className="text-3xl font-bold text-primary mt-1">{formatCurrency(financialData.aReceber)}</p>
            </div>
          </motion.div>

          {/* Produtos na produ\u00E7\u00E3o */}
          <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1} className="bg-card rounded-xl p-6 western-shadow">
            <h2 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
              <AlignStartVertical className="text-primary" size={22} /> Produtos na produ\u00E7\u00E3o
            </h2>
            <div className="flex gap-2 mb-4 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-muted text-muted-foreground hover:bg-primary/10 transition-colors flex items-center gap-1">
                    Produto {prodProductFilter.size > 0 && `(${prodProductFilter.size})`} <ChevronDown size={14} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 max-h-60 overflow-y-auto">
                  {PROD_PRODUCT_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer text-sm">
                      <Checkbox checked={prodProductFilter.has(opt.value)} onCheckedChange={(checked) => {
                        setProdProductFilter(prev => { const next = new Set(prev); checked ? next.add(opt.value) : next.delete(opt.value); return next; });
                      }} />
                      {opt.label}
                    </label>
                  ))}
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-muted text-muted-foreground hover:bg-primary/10 transition-colors flex items-center gap-1">
                    Vendedor {prodVendedorFilter.size > 0 && `(${prodVendedorFilter.size})`} <ChevronDown size={14} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2 max-h-60 overflow-y-auto">
                  {vendedores.map(v => (
                    <label key={v} className="flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer text-sm">
                      <Checkbox checked={prodVendedorFilter.has(v)} onCheckedChange={(checked) => {
                        setProdVendedorFilter(prev => { const next = new Set(prev); checked ? next.add(v) : next.delete(v); return next; });
                      }} />
                      {v}
                    </label>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
            <div className="bg-muted rounded-lg p-4 mb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total em produ\u00E7\u00E3o</p>
              <p className="text-3xl font-bold text-primary mt-1">{produtosProducao} {produtosProducao === 1 ? 'produto' : 'produtos'}</p>
            </div>
            <Progress value={produtosProducao > 0 ? Math.min(produtosProducao / Math.max(totalProducao, 1) * 100, 100) : 0} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">{produtosProducao} de {totalProducao} produtos totais est\u00E3o em produ\u00E7\u00E3o</p>
          </motion.div>
        </div>
      </div>

      {/* Pedidos de Alerta — only Juliana (admin-1) */}
      {user?.nomeUsuario?.toLowerCase() === '7estrivos' && (() => {
        const FINAL_STAGES = ['Expedi\u00E7\u00E3o', 'Entregue', 'Cobrado', 'Pago'];
        const alertOrders = sourceOrders.filter(o => {
          const overdue = o.diasRestantes === 0 && !FINAL_STAGES.includes(o.status);
          const regressed = o.historico.some((h: any) => FINAL_STAGES.includes(h.local)) && !FINAL_STAGES.includes(o.status);
          return overdue || regressed;
        }).filter(o => !checkedAlertIds.has(o.id));
        return alertOrders.length > 0 ? (
          <div className="mt-8">
            <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={2} className="bg-card rounded-xl p-6 western-shadow">
              <h2 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
                <AlertTriangle className="text-destructive" size={22} /> Pedidos de Alerta
              </h2>
              <p className="text-sm text-muted-foreground mb-3">Pedidos atrasados ou que regrediram na produ\u00E7\u00E3o</p>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {alertOrders.map(o => (
                  <div key={o.id} className="flex items-center gap-2">
                    <Link to={`/pedido/${o.id}`} className="flex-1 flex items-center justify-between p-3 bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors">
                      <div>
                        <span className="font-bold text-sm">{o.numero}</span>
                        <span className="text-xs text-muted-foreground ml-2">{'\u2014'} {o.vendedor}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold bg-destructive/20 text-destructive px-2 py-0.5 rounded">{o.status}</span>
                        {o.diasRestantes === 0 && <span className="text-xs text-destructive ml-2">Prazo atingido</span>}
                      </div>
                    </Link>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleChecked(o.id); }}
                      className="shrink-0 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                      title="Marcar como conferido"
                    >
                      <Check size={14} /> Conferido
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        ) : null;
      })()}

      {/* Pedidos Apagados — only Juliana (7estrivos) */}
      {user?.nomeUsuario?.toLowerCase() === '7estrivos' && deletedOrders.length > 0 && (
        <div className="mt-8">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={3} className="bg-card rounded-xl p-6 western-shadow">
            <h2 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
              <Trash2 className="text-destructive" size={22} /> Pedidos Apagados
            </h2>
            <p className="text-sm text-muted-foreground mb-3">Pedidos removidos por usu\u00E1rios</p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {deletedOrders.map(d => {
                const od = d.order_data || {};
                return (
                  <div key={d.id} className="flex items-center gap-2">
                    <div className="flex-1 p-3 bg-destructive/10 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-sm">{od.numero || 'S/N'}</span>
                          <span className="text-xs text-muted-foreground ml-2">{'\u2014'} {od.vendedor || 'N/A'}</span>
                        </div>
                        <span className="text-xs text-destructive font-semibold">Removido</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setViewingDeletedOrder(d)}
                      className="shrink-0 px-2 py-2 bg-muted hover:bg-muted/80 rounded-lg text-xs transition-colors"
                      title="Visualizar"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleRestoreOrder(d)}
                      className="shrink-0 px-2 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                      title="Restaurar pedido"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      onClick={() => handleDismissDeleted(d.id)}
                      className="shrink-0 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                      title="Marcar como conferido"
                    >
                      <Check size={14} /> Conferido
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      {/* Dialog para visualizar pedido apagado */}
      <Dialog open={!!viewingDeletedOrder} onOpenChange={open => !open && setViewingDeletedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedido Apagado {'\u2014'} {viewingDeletedOrder?.order_data?.numero || 'S/N'}</DialogTitle>
          </DialogHeader>
          {viewingDeletedOrder && (
            <div className="space-y-2 text-sm">
              {Object.entries(viewingDeletedOrder.order_data || {}).filter(([k]) => !['id', 'created_at', 'historico', 'alteracoes', 'fotos', 'user_id'].includes(k)).map(([key, val]) => (
                <div key={key} className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground font-medium">{key}</span>
                  <span className="text-right max-w-[60%] break-words">{typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Specialized reports section */}
      <div className="mt-8">
        <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={4}>
          <SpecializedReports reports={['escalacao', 'forro', 'palmilha', 'forma', 'pesponto', 'metais', 'bordados', 'corte', 'expedicao', 'cobranca', 'extras_cintos']} />
        </motion.div>
      </div>

      <div className="mt-8 space-y-6">
        <SoladoBoard title="Pedidos com sola de couro" orders={solaCouroOrders} storageKey="dismissed_sola_couro" />
        <SoladoBoard title="Pedidos com sola r\u00FAstica" orders={solaRusticaOrders} storageKey="dismissed_sola_rustica" />
        <SoladoBoard title="Pedidos com vira colorida" orders={viraColoridaOrders} storageKey="dismissed_vira_colorida" />
      </div>

      {/* Storage monitoring — only Juliana */}
      {isJuliana && storageInfo && (
        <div className="mt-8">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={5} className="bg-card rounded-xl p-6 western-shadow">
            <h2 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
              <HardDrive className="text-primary" size={22} /> Armazenamento Supabase
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {storageInfo.db_size_mb} MB / {storageInfo.limit_mb} MB
                  </span>
                  {storageInfo.db_size_mb / storageInfo.limit_mb > 0.8 && (
                    <span className="text-xs font-bold text-destructive flex items-center gap-1">
                      <AlertTriangle size={14} /> Pr\u00F3ximo do limite!
                    </span>
                  )}
                </div>
                <Progress
                  value={Math.min((storageInfo.db_size_mb / storageInfo.limit_mb) * 100, 100)}
                  className={`h-4 ${storageInfo.db_size_mb / storageInfo.limit_mb > 0.8 ? '[&>div]:bg-destructive' : ''}`}
                />
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{storageInfo.order_count} pedidos no banco</span>
                <span>{storageInfo.deleted_order_count} registros de pedidos apagados</span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={cleanupLoading}
                    className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-bold hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {cleanupLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    Limpar dados antigos
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza que deseja limpar os dados antigos?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Pedidos com status <strong>"Pago"</strong> h\u00E1 mais de 90 dias ter\u00E3o seus detalhes removidos permanentemente (fotos, hist\u00F3rico, altera\u00E7\u00F5es, observa\u00E7\u00F5es, n\u00FAmero, modelo, etc.).
                      <br /><br />
                      <strong>Apenas vendedor, quantidade e valor ser\u00E3o mantidos</strong> para os gr\u00E1ficos de vendas.
                      <br /><br />
                      Essa a\u00E7\u00E3o n\u00E3o pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCleanup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Confirmar limpeza
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
};

export default AdminDashboard;
