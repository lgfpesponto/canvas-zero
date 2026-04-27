import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingValueProps {
  /** Whether the underlying data is still being fetched */
  loading: boolean;
  /** Whether real data is already available (used to avoid blinking on refetches) */
  hasData?: boolean;
  /** Visual size of the spinner in px */
  size?: number;
  /** Extra classes for the wrapper */
  className?: string;
  /** Render the value when ready */
  children: React.ReactNode;
}

/**
 * Show a spinner while the first fetch is in progress.
 * After data arrives, the value (children) is rendered — even during refetches —
 * to avoid flickering between values and spinners.
 */
export function LoadingValue({ loading, hasData = false, size = 18, className, children }: LoadingValueProps) {
  if (loading && !hasData) {
    return (
      <span className={cn('inline-flex items-center text-muted-foreground', className)}>
        <Loader2 className="animate-spin" size={size} />
      </span>
    );
  }
  return <>{children}</>;
}

export default LoadingValue;
