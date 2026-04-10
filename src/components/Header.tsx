import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, User, LogOut, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import logo from '@/assets/logo-7estrivos.png';

const Header = () => {
  const { isLoggedIn, user, isAdmin, role, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const [storageWarning, setStorageWarning] = useState<{ percent: number } | null>(null);

  const isJuliana = role === 'admin_master';

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

  const navItems = isLoggedIn
    ? [
        { label: 'FAÇA SEU PEDIDO', path: '/pedido' },
        { label: 'EXTRAS', path: '/extras' },
        { label: 'MEUS PEDIDOS', path: '/relatorios' },
        ...(isAdmin ? [{ label: 'USUÁRIOS', path: '/usuarios' }, { label: 'CONFIGURAÇÕES', path: '/admin/configuracoes' }] : []),
        { label: 'MEU PERFIL', path: '/perfil' },
      ]
    : [
        { label: 'FAÇA SEU PEDIDO', path: '/pedido' },
        { label: 'EXTRAS', path: '/extras' },
        { label: 'MEUS PEDIDOS', path: '/relatorios' },
        { label: 'LOGIN', path: '/login' },
      ];

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
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-4 py-2 rounded-md text-sm font-semibold tracking-wider transition-all duration-200 ${
                location.pathname === item.path
                  ? 'bg-primary text-primary-foreground'
                  : 'text-primary hover:bg-primary/10'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {isLoggedIn && (
            <button
              onClick={logout}
              className="ml-2 flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-primary hover:bg-destructive/10 transition-colors"
            >
              <LogOut size={16} />
              SAIR
            </button>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-primary p-2"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="md:hidden bg-white border-t border-border/30 px-4 pb-4">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-3 rounded-md text-sm font-semibold tracking-wider ${
                location.pathname === item.path
                  ? 'bg-primary text-primary-foreground'
                  : 'text-primary hover:bg-primary/10'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {isLoggedIn && (
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
