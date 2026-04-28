import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AdminAssistantPanel from './AdminAssistantPanel';

export default function AdminAssistantFab() {
  const [open, setOpen] = useState(false);
  const { role } = useAuth();
  const location = useLocation();

  // Só admin_master vê
  if (role !== 'admin_master') return null;

  // Não mostra na tela de login
  if (location.pathname === '/login' || location.pathname === '/verificar') return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir assistente"
        className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
      >
        <Sparkles className="h-5 w-5" />
      </button>
      <AdminAssistantPanel open={open} onOpenChange={setOpen} />
    </>
  );
}
