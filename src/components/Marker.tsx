import type { PlanDisplay } from '../lib/plan';
import type { Category } from '../types';

export function catClass(c: Category | undefined): string {
  return c ? `cat-${c.toLowerCase()}` : '';
}

/** Small colour dot for a recipe's category, or a line icon for notes like "Out". */
export function Marker({ plan, size = 'md' }: { plan: PlanDisplay | null; size?: 'sm' | 'md' }) {
  if (!plan) return <span className={`marker marker-${size} marker-empty`} aria-hidden />;
  if (plan.icon) {
    const Icon = plan.icon;
    return (
      <span className={`marker marker-${size} marker-icon`} aria-hidden>
        <Icon size={size === 'sm' ? 12 : 14} strokeWidth={2} />
      </span>
    );
  }
  return <span className={`marker marker-${size} marker-dot ${catClass(plan.category)}`} aria-hidden />;
}
