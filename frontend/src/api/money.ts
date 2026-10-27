const priceFormatter = new Intl.NumberFormat('ru-RU');

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Moscow',
});

const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Moscow',
});

export function formatPrice(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${priceFormatter.format(value)} ₽`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${dateFormatter.format(date)}, ${timeFormatter.format(date)}`;
}

export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return dateFormatter.format(date);
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return timeFormatter.format(date);
}

export function formatEarlyUntil(iso: string | null | undefined): string {
  if (!iso) return '';
  return `Откроется ${formatDateOnly(iso)} в ${formatTime(iso)}`;
}

export function formatCount(value: number): string {
  return `${priceFormatter.format(value)} поз.`;
}
