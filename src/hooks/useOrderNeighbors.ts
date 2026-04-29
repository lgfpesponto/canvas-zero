import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface NeighborInfo {
  prevId: string | null;
  nextId: string | null;
  index: number; // 0-based; -1 if not found
  total: number;
  loading: boolean;
}

/**
 * Returns the previous/next order id relative to currentId,
 * using the same visibility scope as the user's order list
 * (vendedor sees own; admin sees all), ordered by created_at DESC.
 */
export function useOrderNeighbors(currentId: string | undefined): NeighborInfo {
  const { user, isAdmin, isLoggedIn } = useAuth();
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isLoggedIn || !user) { setIds([]); return; }
      setLoading(true);
      try {
        const BATCH = 1000;
        let all: { id: string }[] = [];
        let offset = 0;
        while (true) {
          let q = supabase
            .from('orders')
            .select('id, created_at')
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(offset, offset + BATCH - 1);
          if (!isAdmin) q = q.eq('user_id', user.id);
          const { data, error } = await q;
          if (error || !data || data.length === 0) break;
          all = all.concat(data.map(d => ({ id: (d as any).id })));
          if (data.length < BATCH) break;
          offset += BATCH;
        }
        if (!cancelled) setIds(all.map(o => o.id));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isLoggedIn, user?.id, isAdmin]);

  return useMemo(() => {
    if (!currentId || ids.length === 0) {
      return { prevId: null, nextId: null, index: -1, total: ids.length, loading };
    }
    const idx = ids.indexOf(currentId);
    if (idx === -1) return { prevId: null, nextId: null, index: -1, total: ids.length, loading };
    return {
      prevId: idx > 0 ? ids[idx - 1] : null,
      nextId: idx < ids.length - 1 ? ids[idx + 1] : null,
      index: idx,
      total: ids.length,
      loading,
    };
  }, [currentId, ids, loading]);
}
