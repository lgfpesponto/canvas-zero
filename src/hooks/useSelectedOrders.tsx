import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SelectedOrdersCtx {
  selectedIds: Set<string>;
  toggle: (id: string) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
  count: number;
}

const Ctx = createContext<SelectedOrdersCtx>({
  selectedIds: new Set(),
  toggle: () => {},
  clear: () => {},
  isSelected: () => false,
  count: 0,
});

export const SelectedOrdersProvider = ({ children }: { children: ReactNode }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelectedIds(new Set()), []);
  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  return (
    <Ctx.Provider value={{ selectedIds, toggle, clear, isSelected, count: selectedIds.size }}>
      {children}
    </Ctx.Provider>
  );
};

export const useSelectedOrders = () => useContext(Ctx);
