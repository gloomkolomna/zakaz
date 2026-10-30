import { useEffect, useState } from 'react';
import type { CardImage } from '../api/endpoints';
import { mediaUrl } from '../api/media';
import ZoomModal from './ZoomModal';

interface CardGalleryProps {
  title: string;
  images: CardImage[];
}

export default function CardGallery({ title, images }: CardGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    setActiveIndex((current) => (current < images.length ? current : 0));
  }, [images.length]);

  if (images.length === 0) {
    return null;
  }

  const active = images[Math.min(activeIndex, images.length - 1)];
  const activeAlt = `${title} — фото ${activeIndex + 1}`;
  const zoomImages = images.map((image, index) => ({
    url: mediaUrl(image.url),
    alt: `${title} — фото ${index + 1}`,
  }));

  return (
    <section className="card-gallery" aria-label={`Фото: ${title}`}>
      <div className="card-gallery-head">
        <h3 className="card-gallery-title">{title}</h3>
        <span className="card-gallery-count">
          {activeIndex + 1} / {images.length}
        </span>
      </div>
      <button
        className="card-gallery-main"
        type="button"
        onClick={() => setZoom(true)}
        aria-label="Увеличить фото"
      >
        <img src={mediaUrl(active.url)} alt={activeAlt} />
      </button>
      {images.length > 1 && (
        <div className="card-gallery-thumbs" role="group" aria-label="Другие фото">
          {images.map((image, index) => (
            <button
              key={image.id}
              className={`card-gallery-thumb${index === activeIndex ? ' is-active' : ''}`}
              type="button"
              aria-label={`Показать фото ${index + 1}`}
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
            >
              <img src={mediaUrl(image.url)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {zoom && (
        <ZoomModal
          src={mediaUrl(active.url)}
          alt={activeAlt}
          images={zoomImages}
          index={activeIndex}
          onIndexChange={setActiveIndex}
          onClose={() => setZoom(false)}
        />
      )}
    </section>
  );
}
