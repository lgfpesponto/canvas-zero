import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { subscribeLoading } from '@/lib/globalLoading';

/**
 * Floating "Carregando" chip shown whenever any HTTP request is in flight.
 * Includes a small delay (180 ms) to avoid flashing on very fast requests.
 */
const GlobalLoadingIndicator = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = subscribeLoading((count) => {
      if (count > 0) {
        if (!timer) {
          timer = setTimeout(() => { setVisible(true); timer = null; }, 180);
        }
      } else {
        if (timer) { clearTimeout(timer); timer = null; }
        setVisible(false);
      }
    });
    return () => { unsub(); if (timer) clearTimeout(timer); };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] pointer-events-none flex items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 text-sm font-semibold text-foreground shadow-lg backdrop-blur"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span>Carregando</span>
    </div>
  );
};

export default GlobalLoadingIndicator;
