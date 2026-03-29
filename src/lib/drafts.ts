export interface Draft {
  id: string;
  userId: string;
  savedAt: string;
  form: Record<string, string>;
  sobMedida: boolean;
  quantidade: number;
  numeroPedido: string;
  cliente: string;
  fotos: string[];
}

const STORAGE_KEY = '7e-drafts';

function getAll(): Draft[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function save(drafts: Draft[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

export function getDrafts(userId: string): Draft[] {
  return getAll().filter(d => d.userId === userId);
}

export function saveDraft(draft: Draft) {
  const all = getAll().filter(d => d.id !== draft.id);
  all.unshift(draft);
  save(all);
}

export function deleteDraft(id: string) {
  save(getAll().filter(d => d.id !== id));
}
