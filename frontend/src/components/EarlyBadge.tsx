import { formatEarlyUntil } from '../api/money';

export default function EarlyBadge({ until }: { until: string | null }) {
  if (!until) return null;
  return (
    <span className="early-badge" title={formatEarlyUntil(until)}>
      До анонса
    </span>
  );
}

export function EarlyNote({ until }: { until: string | null }) {
  if (!until) return null;
  return <div className="early-note">{formatEarlyUntil(until)}</div>;
}
