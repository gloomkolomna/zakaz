import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import bridge from '@vkontakte/vk-bridge';
import type { Video } from '../api/endpoints';
import { mediaUrl } from '../api/media';
import { videoPoster, videoSource } from '../api/video';

function openExternal(url: string) {
  bridge.send('VKWebAppOpenLink' as any, { link: url }).catch(() => {
    window.open(url, '_blank', 'noopener,noreferrer');
  });
}

export default function VideoBlock({ video, cover }: { video: Video | null; cover: string | null }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const source = videoSource(video);
  const poster = videoPoster(video, cover);
  const posterUrl = mediaUrl(poster);
  const sourceUrl = mediaUrl(source);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!source) return null;

  const isFile = Boolean(video?.file_url);

  function play() {
    if (isFile) {
      setOpen(true);
      return;
    }
    if (video?.url) openExternal(video.url);
  }

  return (
    <>
      <div className="video-block">
        <button className="video-poster" type="button" onClick={play} aria-label="Смотреть видеообзор">
          {posterUrl && !failed ? (
            <img src={posterUrl} alt="Видеообзор" onError={() => setFailed(true)} />
          ) : (
            <span className="video-placeholder" />
          )}
          <span className="video-play" aria-hidden="true">
            ▶
          </span>
        </button>
        <div className="video-caption">
          <span>Видеообзор</span>
          {!isFile && <span className="video-note">Откроется в новой вкладке</span>}
        </div>
      </div>

      {open &&
        isFile &&
        createPortal(
          <div className="modal video-modal" role="dialog" aria-modal="true" aria-label="Видеообзор" onClick={() => setOpen(false)}>
            <div className="video-modal-card" onClick={(event) => event.stopPropagation()}>
              <button className="video-close" type="button" onClick={() => setOpen(false)} aria-label="Закрыть">
                ×
              </button>
              <video src={sourceUrl} controls playsInline preload="metadata" poster={posterUrl || undefined} />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
