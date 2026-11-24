import { CloudOff, Smartphone } from 'lucide-react';
import type { SyncStatus } from '../lib/store';

const LABELS: Record<SyncStatus, string> = {
  connecting: 'Connecting',
  synced: 'Shared',
  saving: 'Saving',
  offline: 'Offline · will sync',
  local: 'This phone only',
};

/** Quiet status line so it's clear whether the other phone can see changes. */
export function SyncBadge({ status }: { status: SyncStatus }) {
  return (
    <span className={`sync-badge sync-${status}`} role="status" title={LABELS[status]}>
      {status === 'offline' ? (
        <CloudOff size={13} strokeWidth={2} />
      ) : status === 'local' ? (
        <Smartphone size={13} strokeWidth={2} />
      ) : (
        <i />
      )}
      {LABELS[status]}
    </span>
  );
}
