import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Send, Pencil, Trash2, MoreVertical, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isDriveUrl, toDriveImageUrl } from '@/lib/driveUrl';

export const MODEL_SCAN_PREFIX = '7EMODEL:';
const PAGE_SIZE = 5;

export interface TemplateItem {
  id: string;
  nome: string;
  form_data: Record<string, unknown>;
  sku?: string | null;
  genero?: string | null;
  foto_url?: string | null;
  tamanhos_skus?: { tamanho: string; sku: string }[] | null;
  seen?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: TemplateItem[];
  search: string;
  onSearchChange: (v: string) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onClearSelection: () => void;
  onUse: (t: TemplateItem) => void;
  onEdit: (t: TemplateItem) => void;
  onDelete: (id: string) => void;
  onSendMany: (ts: TemplateItem[]) => void;
}

function TemplateCard({
  t,
  isChecked,
  onToggleSelect,
  onUse,
  onEdit,
  onDelete,
  onSend,
}: {
  t: TemplateItem;
  isChecked: boolean;
  onToggleSelect: () => void;
  onUse: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSend: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const hasPhoto = !!t.foto_url;
  const imgSrc = hasPhoto ? (isDriveUrl(t.foto_url!) ? toDriveImageUrl(t.foto_url!) : t.foto_url!) : null;
  const qrValue = `${MODEL_SCAN_PREFIX}${t.id}`;

  return (
    <div className="bg-muted rounded-lg overflow-hidden border border-border">
      {hasPhoto && (
        <div className="w-full h-32 bg-background relative flex items-center justify-center overflow-hidden">
          {imgSrc && !imgErr ? (
            <img
              src={imgSrc}
              alt={t.nome}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
            />
          ) : (
            <ImageOff className="text-muted-foreground" size={24} />
          )}
        </div>
      )}
      <div className="p-3 flex items-start gap-3">
        {hasPhoto && (
          <div className="shrink-0 bg-white p-1 rounded border border-border" title="Escaneie para preencher">
            <QRCodeSVG value={qrValue} size={64} level="M" />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <Checkbox
              checked={isChecked}
              onCheckedChange={onToggleSelect}
              title="Selecionar para envio em lote"
              className="mt-0.5"
            />
            <span className="font-semibold text-sm break-words flex-1">{t.nome}</span>
            {t.seen === false && (
              <Badge variant="destructive" className="text-[10px] py-0 px-1.5 shrink-0">Novo</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" onClick={onUse} className="flex-1">Preencher</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 w-9 p-0" title="Mais opções">
                  <MoreVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onSend}>
                  <Send size={14} className="mr-2" /> Enviar modelo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil size={14} className="mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                  <Trash2 size={14} className="mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TemplatesDialog({
  open,
  onOpenChange,
  templates,
  search,
  onSearchChange,
  selectedIds,
  onToggleSelect,
  onClearSelection,
  onUse,
  onEdit,
  onDelete,
  onSendMany,
}: Props) {
  const [page, setPage] = useState(1);
  const scanBufferRef = useRef('');
  const scanInputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(
    () => templates.filter(t => t.nome.toLowerCase().includes(search.toLowerCase())),
    [templates, search],
  );

  useEffect(() => { setPage(1); }, [search, templates.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Scanner físico invisível: escuta enter e roteia por 7EMODEL:<uuid>
  useEffect(() => {
    if (!open) { scanBufferRef.current = ''; return; }
    const handler = (e: KeyboardEvent) => {
      // Ignora se usuário está digitando em input/textarea que não seja o próprio scanner
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTypingInput = target && (tag === 'INPUT' || tag === 'TEXTAREA') && target !== scanInputRef.current;
      if (isTypingInput) return;
      if (e.key === 'Enter') {
        const code = scanBufferRef.current.trim();
        scanBufferRef.current = '';
        if (code.startsWith(MODEL_SCAN_PREFIX)) {
          const id = code.slice(MODEL_SCAN_PREFIX.length);
          const t = templates.find(tt => tt.id === id);
          if (t) {
            e.preventDefault();
            onUse(t);
            toast.success(`Modelo "${t.nome}" carregado via scanner`);
          }
        }
        return;
      }
      if (e.key.length === 1) {
        scanBufferRef.current += e.key;
        if (scanBufferRef.current.length > 200) scanBufferRef.current = '';
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, templates, onUse]);

  const bulkTemplates = templates.filter(t => selectedIds.includes(t.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modelos Salvos</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Pesquisar modelo..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="mb-2"
        />
        {templates.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum modelo salvo ainda.</p>
        )}
        {templates.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum modelo encontrado.</p>
        )}
        {pageItems.length > 0 && (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {pageItems.map(t => (
              <TemplateCard
                key={t.id}
                t={t}
                isChecked={selectedIds.includes(t.id)}
                onToggleSelect={() => onToggleSelect(t.id)}
                onUse={() => onUse(t)}
                onEdit={() => onEdit(t)}
                onDelete={() => onDelete(t.id)}
                onSend={() => onSendMany([t])}
              />
            ))}
          </div>
        )}

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-2 pt-2 border-t border-border mt-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="text-xs text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
            <span className="text-sm font-semibold">
              {selectedIds.length} modelo{selectedIds.length > 1 ? 's' : ''} selecionado{selectedIds.length > 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={onClearSelection}>Limpar</Button>
              <Button size="sm" onClick={() => onSendMany(bulkTemplates)}>
                <Send size={14} className="mr-1" /> Enviar
              </Button>
            </div>
          </div>
        )}

        {/* Input invisível apenas para acessibilidade — scanner captura via window keydown */}
        <input
          ref={scanInputRef}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          readOnly
        />
      </DialogContent>
    </Dialog>
  );
}
