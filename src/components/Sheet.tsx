import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  kicker?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Bottom sheet: slides up from the bottom, easy to reach with a thumb. */
export function Sheet({ open, onClose, title, subtitle, kicker, children, footer, className = '' }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={`sheet ${className}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div>
            {kicker && <p className="kicker">{kicker}</p>}
            <h2 className="title">{title}</h2>
            {subtitle && <p className="muted small">{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>
  );
}
