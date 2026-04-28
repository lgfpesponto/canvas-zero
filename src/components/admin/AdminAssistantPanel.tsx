import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Plus, History, AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import AssistantMessage from './AssistantMessage';
import { useAdminAssistant } from '@/hooks/useAdminAssistant';
import { getRecentErrors } from '@/lib/consoleErrorCapture';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminAssistantPanel({ open, onOpenChange }: Props) {
  const {
    conversations, activeId, messages, sending, loading,
    sendMessage, selectConversation, newConversation, deleteConversation,
  } = useAdminAssistant(open);

  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll quando chega mensagem nova
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, sending]);

  const handleSend = () => {
    if (!input.trim() || sending) return;
    sendMessage(input);
    setInput('');
  };

  const handleReportProblem = () => {
    const errors = getRecentErrors().slice(-5);
    const errorBlock = errors.length
      ? errors.map(e => `- [${e.type}] ${e.message}`).join('\n')
      : '(nenhum erro recente capturado)';
    const template = `Estou na página \`${location.pathname}${location.search}\` e aconteceu o seguinte problema:\n\n[descreva o que aconteceu]\n\n**Últimos erros do console:**\n${errorBlock}`;
    setInput(template);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[420px] p-0 flex flex-col gap-0"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Assistente 7Estrivos</span>
            <span className="text-xs text-muted-foreground">IA exclusiva admin_master</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" title="Nova conversa" onClick={() => { newConversation(); setShowHistory(false); }}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Histórico" onClick={() => setShowHistory(v => !v)}>
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Histórico (drawer interno) */}
        {showHistory && (
          <div className="border-b bg-muted/30 max-h-64 overflow-auto">
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Conversas anteriores</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowHistory(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            {conversations.length === 0 ? (
              <p className="px-4 pb-3 text-xs text-muted-foreground">Nenhuma conversa ainda.</p>
            ) : (
              <ul>
                {conversations.map(c => (
                  <li key={c.id} className="flex items-center gap-1 px-2">
                    <button
                      onClick={() => { selectConversation(c.id); setShowHistory(false); }}
                      className={`flex-1 text-left px-2 py-1.5 text-xs rounded hover:bg-accent truncate ${activeId === c.id ? 'bg-accent font-medium' : ''}`}
                    >
                      <div className="truncate">{c.titulo}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {format(parseISO(c.updated_at), "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => { if (confirm('Apagar esta conversa?')) deleteConversation(c.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Mensagens */}
        <ScrollArea className="flex-1 px-3 py-3" ref={scrollRef as any}>
          <div className="space-y-3">
            {messages.length === 0 && !loading && (
              <div className="text-center text-sm text-muted-foreground py-8 space-y-2">
                <p className="font-medium">Olá! 👋</p>
                <p className="text-xs">Pergunte qualquer coisa sobre o portal: pedidos, vendedores, saldos, regras, erros que apareceram...</p>
                <div className="pt-3 text-left text-xs space-y-1">
                  <p className="font-medium text-foreground">Exemplos:</p>
                  <p>• "Me mostra o pedido 7E-AAAA0123"</p>
                  <p>• "Qual o saldo da Stefany?"</p>
                  <p>• "Quais pedidos estão atrasados?"</p>
                  <p>• "Vi um erro no console: [cole aqui]"</p>
                </div>
              </div>
            )}
            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {messages.map((m, i) => (
              <AssistantMessage key={m.id || i} role={m.role} content={m.content} />
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Pensando...
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Botão reportar problema */}
        <div className="px-3 py-2 border-t border-b">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-xs"
            onClick={handleReportProblem}
            disabled={sending}
          >
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            Reportar problema desta página
          </Button>
        </div>

        {/* Input */}
        <div className="p-3 flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte alguma coisa..."
            className="min-h-[44px] max-h-32 resize-none text-sm"
            disabled={sending}
          />
          <Button onClick={handleSend} disabled={!input.trim() || sending} size="icon">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
