import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFinanceiroSaldoAccess } from '@/hooks/useFinanceiroSaldoAccess';
import { useNfeAccess } from '@/hooks/useNfeAccess';
import { Menu, X, LogOut, AlertTriangle, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import logo from '@/assets/logo-7estrivos.png';
import NotificacoesBell from '@/components/NotificacoesBell';

type SubItem = { label: string; path: string };
type NavItem = { label: string; path: string; subItems?: SubItem[] };

const Header = () => {
  const { isLoggedIn, user, isAdmin, role, logout, loading: authLoading } = useAuth();
  const { canSeeRevendedorView, isAdminMaster } = useFinanceiroSaldoAccess();
  const hasNfeAccess = useNfeAccess();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const [storageWarning, setStorageWarning] = useState<{ percent: number } | null>(null);

  const isJuliana = role === 'admin_master';
  const showAsLogged = isLoggedIn || authLoading;

  useEffect(() => {
    if (!isAdmin || !isJuliana) return;
    try {
      const stored = sessionStorage.getItem('storage_info');
      if (stored) {
        const info = JSON.parse(stored);
        const percent = Math.round((info.db_size_mb / info.limit_mb) * 100);
        if (percent > 80) {
          setStorageWarning({ percent });
        }
      }
    } catch {}
  }, [isAdmin, isJuliana, location.pathname]);

  const isBagyAccess = isAdmin || role === 'vendedor_comissao';
  const canSeeModelos = showAsLogged && role !== 'bordado' && role !== 'montagem';

  const configSubItems: SubItem[] = [
    { label: 'Ficha de produção', path: '/admin/configuracoes?tab=fichas' },
    { label: 'Extras', path: '/admin/configuracoes?tab=extras' },
    { label: 'Progresso de produção', path: '/admin/configuracoes?tab=progresso' },
    { label: 'Relatórios', path: '/admin/configuracoes?tab=relatorios' },
    ...(isJuliana ? [
      { label: 'Usuários', path: '/admin/configuracoes?tab=usuarios' },
      { label: 'Gestão', path: '/admin/configuracoes?tab=gestao' },
      { label: 'Sincronização atacado', path: '/admin/configuracoes?tab=atacado-sync' },
      { label: 'Financeiro', path: '/admin/configuracoes?tab=financeiro' },
      ...(hasNfeAccess ? [{ label: 'NF-e', path: '/admin/configuracoes?tab=nfe' }] : []),
    ] : []),
  ];

  const navItems: NavItem[] = showAsLogged
    ? [
        { label: 'FAÇA SEU PEDIDO', path: '/pedido' },
        ...(canSeeModelos ? [{ label: 'MODELOS', path: '/modelos' }] : []),
        { label: 'EXTRAS', path: '/extras' },
        { label: 'ESTOQUE', path: '/estoque' },
        { label: 'MEUS PEDIDOS', path: '/relatorios' },
        ...(isBagyAccess ? [{ label: 'PEDIDOS BAGY', path: '/rancho-chique/pedidos' }] : []),
        ...(isAdmin && !isJuliana && role !== 'admin_producao' ? [{ label: 'USUÁRIOS', path: '/usuarios' }] : []),
        ...(isAdmin && role !== 'admin_producao' ? [{ label: 'CONFIGURAÇÕES', path: '/admin/configuracoes', subItems: configSubItems }] : []),
        ...(canSeeRevendedorView && !isAdminMaster ? [{ label: 'COMPROVANTES', path: '/financeiro/saldo' }] : []),
        { label: 'MEU PERFIL', path: '/perfil' },
      ]
    : [
        { label: 'FAÇA SEU PEDIDO', path: '/pedido' },
        { label: 'EXTRAS', path: '/extras' },
        { label: 'MEUS PEDIDOS', path: '/relatorios' },
        { label: 'LOGIN', path: '/login' },
      ];

  const isPathActive = (path: string) => {
    const [p] = path.split('?');
    return location.pathname === p;
  };

  return (
    <>
      {storageWarning && (
        <div className="bg-accent text-accent-foreground text-center text-sm font-semibold py-2 px-4 flex items-center justify-center gap-2 border-b border-border">
          <AlertTriangle size={16} className="text-destructive" />
          Armazenamento próximo do limite ({storageWarning.percent}%). Acesse o dashboard para limpar dados antigos.
        </div>
      )}
    <header className="sticky top-0 z-50 bg-white shadow-lg">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="7ESTRIVOS" className="h-12 w-12 object-contain" />
          <span className="hidden sm:block font-display text-xl font-bold text-primary tracking-wide">
            7ESTRIVOS
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(item => {
            const active = isPathActive(item.path);
            const hasSub = item.subItems && item.subItems.length > 0;
            const triggerClass = `px-4 py-2 rounded-md text-sm font-semibold tracking-wider transition-all duration-200 flex items-center gap-1 ${
              active ? 'bg-primary text-primary-foreground' : 'text-primary hover:bg-primary/10'
            }`;

            if (hasSub) {
              return (
                <div key={item.path} className="relative group">
                  <Link to={item.path} className={triggerClass}>
                    {item.label}
                    <ChevronDown size={14} className="transition-transform group-hover:rotate-180" />
                  </Link>
                  <div className="absolute left-0 top-full pt-1 min-w-[240px] hidden group-hover:block z-50">
                    <div className="bg-primary text-primary-foreground rounded-md shadow-xl overflow-hidden py-1">
                      {item.subItems!.map(sub => (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          className="block px-4 py-2 text-sm font-medium hover:bg-primary-foreground/15 transition-colors"
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link key={item.path} to={item.path} className={triggerClass}>
                {item.label}
              </Link>
            );
          })}
          {showAsLogged && isLoggedIn && (
            <>
              <NotificacoesBell />
              <button
                onClick={logout}
                className="ml-2 flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-primary hover:bg-destructive/10 transition-colors"
              >
                <LogOut size={16} />
                SAIR
              </button>
            </>
          )}
        </nav>

        {/* Mobile: bell + menu button */}
        <div className="flex items-center gap-1 md:hidden">
          {showAsLogged && isLoggedIn && <NotificacoesBell />}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-primary p-2"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="md:hidden bg-white border-t border-border/30 px-4 pb-4">
          {navItems.map(item => (
            <div key={item.path}>
              <Link
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-3 rounded-md text-sm font-semibold tracking-wider ${
                  isPathActive(item.path) ? 'bg-primary text-primary-foreground' : 'text-primary hover:bg-primary/10'
                }`}
              >
                {item.label}
              </Link>
              {item.subItems && item.subItems.map(sub => (
                <Link
                  key={sub.path}
                  to={sub.path}
                  onClick={() => setMenuOpen(false)}
                  className="block pl-8 pr-4 py-2 text-sm text-primary/80 hover:bg-primary/10 rounded-md"
                >
                  {sub.label}
                </Link>
              ))}
            </div>
          ))}
          {showAsLogged && isLoggedIn && (
            <button
              onClick={() => { logout(); setMenuOpen(false); }}
              className="w-full text-left px-4 py-3 rounded-md text-sm font-semibold text-primary hover:bg-destructive/10"
            >
              SAIR
            </button>
          )}
        </nav>
      )}
    </header>
    </>
  );
};

export default Header;
