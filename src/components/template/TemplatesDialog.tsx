import { useEffect, useMemo, useRef, useState } from 'react';

import { toast } from 'sonner';
import { Send, Pencil, Trash2, MoreVertical, ChevronLeft, ChevronRight, ImageOff, AlertTriangle, Filter } from 'lucide-react';
import FichaFiltersDialog from '@/components/common/FichaFiltersDialog';
import { buildFichaOptions, matchesFichaFilters, countActiveFicha } from '@/lib/fichaFilterKeys';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { isDriveUrl, toDriveImageUrl } from '@/lib/driveUrl';
import { useIsMobile } from '@/hooks/use-mobile';
import type { TemplateValidity } from '@/hooks/useTemplateValidity';

export const MODEL_SCAN_PREFIX = '7EMODEL:';

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
  /** Mapa id → validade contra a versão vigente da ficha. Opcional. */
  validityById?: Map<string, TemplateValidity>;
}

function TemplateCard({
  t,
  isChecked,
  validity,
  onToggleSelect,
  onUse,
  onEdit,
  onDelete,
  onSend,
}: {
  t: TemplateItem;
  isChecked: boolean;
  validity?: TemplateValidity;
  onToggleSelect: () => void;
  onUse: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSend: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const hasPhoto = !!t.foto_url;
  const imgSrc = hasPhoto ? (isDriveUrl(t.foto_url!) ? toDriveImageUrl(t.foto_url!) : t.foto_url!) : null;
  const invalid = validity && !validity.valid;
  const removedText = invalid ? validity!.removed.map(r => `${r.campo}: "${r.valor}"`).join('\n') : '';

  return (
    <div className="bg-muted rounded-lg overflow-hidden border border-border flex flex-col">
      <div className="w-full h-48 sm:h-40 bg-background relative flex items-center justify-center overflow-hidden">
        {imgSrc && !imgErr ? (
          <img
            src={imgSrc}
            alt={t.nome}
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="flex flex-col items-center text-muted-foreground">
            <ImageOff size={24} />
            <span className="text-xs mt-1">Sem foto</span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex items-start gap-2">
          <span
            className="font-medium text-xs text-foreground line-clamp-2 flex-1 leading-tight"
            title={t.nome}
          >
            {t.nome}
          </span>
          {t.seen === false && (
            <Badge variant="destructive" className="text-[10px] py-0 px-1.5 shrink-0">Novo</Badge>
          )}
        </div>
        {invalid && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="w-full justify-center gap-1 text-[10px] cursor-help">
                  <AlertTriangle size={11} /> variação excluída, entre para editar
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs whitespace-pre-line text-xs">
                {removedText}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <div className="flex items-center gap-1.5 mt-auto">
          <Checkbox
            checked={isChecked}
            onCheckedChange={onToggleSelect}
            title="Selecionar para envio em lote"
            className="shrink-0"
          />
          <Button
            size="sm"
            onClick={onUse}
            disabled={invalid}
            title={invalid ? 'Variação excluída — clique em Editar para corrigir' : undefined}
            className="flex-1"
          >
            Preencher
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-9 w-9 p-0" title="Mais opções">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTimeout(onSend, 0)} disabled={invalid}>
                <Send size={14} className="mr-2" /> Enviar modelo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeout(onEdit, 0)}>
                <Pencil size={14} className="mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeout(onDelete, 0)} className="text-destructive focus:text-destructive">
                <Trash2 size={14} className="mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
  validityById,
}: Props) {
  const isMobile = useIsMobile();
  const PAGE_SIZE = isMobile ? 2 : 6;
  const [page, setPage] = useState(1);
  const [selFicha, setSelFicha] = useState<Record<string, Set<string>>>({});
  const [fichaFilterOpen, setFichaFilterOpen] = useState(false);
  const scanBufferRef = useRef('');
  const scanInputRef = useRef<HTMLInputElement | null>(null);

  const fichaOptions = useMemo(
    () => buildFichaOptions(templates, t => ({ ...(t.form_data || {}), genero: ((t.form_data as any)?.genero ?? t.genero) as string | undefined })),
    [templates],
  );

  const filtered = useMemo(
    () => templates.filter(t => {
      if (!t.nome.toLowerCase().includes(search.toLowerCase())) return false;
      const snap = { ...(t.form_data || {}), genero: ((t.form_data as any)?.genero ?? t.genero) };
      if (!matchesFichaFilters(snap, selFicha)) return false;
      return true;
    }),
    [templates, search, selFicha],
  );

  useEffect(() => { setPage(1); }, [search, templates.length, isMobile, selFicha]);

  const toggleFicha = (k: string, v: string) => {
    setSelFicha(prev => {
      const cur = new Set(prev[k] || []);
      if (cur.has(v)) cur.delete(v); else cur.add(v);
      return { ...prev, [k]: cur };
    });
  };
  const activeFichaCount = countActiveFicha(selFicha);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Scanner físico invisível: escuta enter e roteia por 7EMODEL:<uuid>
  useEffect(() => {
    if (!open) { scanBufferRef.current = ''; return; }
    const handler = (e: KeyboardEvent) => {
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
  const showPager = filtered.length > PAGE_SIZE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
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
          <div className="flex items-stretch gap-2">
            {showPager && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-auto w-10 shrink-0 self-stretch"
                aria-label="Página anterior"
              >
                <ChevronLeft size={20} />
              </Button>
            )}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[70vh] overflow-y-auto pr-1">
              {pageItems.map(t => (
                <TemplateCard
                  key={t.id}
                  t={t}
                  isChecked={selectedIds.includes(t.id)}
                  validity={validityById?.get(t.id)}
                  onToggleSelect={() => onToggleSelect(t.id)}
                  onUse={() => onUse(t)}
                  onEdit={() => onEdit(t)}
                  onDelete={() => onDelete(t.id)}
                  onSend={() => onSendMany([t])}
                />
              ))}
            </div>
            {showPager && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-auto w-10 shrink-0 self-stretch"
                aria-label="Próxima página"
              >
                <ChevronRight size={20} />
              </Button>
            )}
          </div>
        )}

        {showPager && (
          <div className="text-center text-xs text-muted-foreground pt-2">
            Página {currentPage} de {totalPages}
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
