export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface SaveInfo {
  state: SaveState;
  message: string | null;
}

export const saveIdle: SaveInfo = { state: 'idle', message: null };
export const saveSaving: SaveInfo = { state: 'saving', message: null };
export const saveDone: SaveInfo = { state: 'saved', message: null };

export function saveError(message: string | null): SaveInfo {
  return { state: 'error', message };
}

export default function SaveStatus({ save, idleLabel }: { save: SaveInfo; idleLabel?: string }) {
  if (save.state === 'idle') {
    return idleLabel ? (
      <span className="save-status" role="status">
        {idleLabel}
      </span>
    ) : null;
  }
  if (save.state === 'saving') {
    return (
      <span className="save-status is-saving" role="status">
        Сохраняю…
      </span>
    );
  }
  if (save.state === 'saved') {
    return (
      <span className="save-status is-saved" role="status">
        Сохранено
      </span>
    );
  }
  if (save.state === 'error') {
    return (
      <span className="save-status is-error" role="status">
        {save.message || 'Не сохранено'}
      </span>
    );
  }
  return null;
}
