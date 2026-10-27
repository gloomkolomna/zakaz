import { formatDate } from '../api/money';

const LABELS: Record<string, string> = {
  new: 'В работе',
  done: 'Выполнен',
  cancelled: 'Отменён',
};

export default function StatusChip({ status }: { status: string }) {
  return <span className={`oc-status${status === 'cancelled' ? ' red' : ''}`}>{LABELS[status] || status}</span>;
}

export function QueueLine({ position }: { position: number | null }) {
  if (!position) return null;
  return <div className="queue-line">№ {position} в очереди</div>;
}

export function OrderDate({ created }: { created: string }) {
  return <span>{formatDate(created)}</span>;
}
