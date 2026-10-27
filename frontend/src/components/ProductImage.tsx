import { useState } from 'react';
import { mediaUrl } from '../api/media';
import ZoomModal from './ZoomModal';
import Logo from './Logo';

interface ProductImageProps {
  src: string | null;
  alt: string;
  className?: string;
  zoomable?: boolean;
}

export default function ProductImage({ src, alt, className = 'product-media', zoomable = true }: ProductImageProps) {
  const [zoom, setZoom] = useState(false);
  const url = mediaUrl(src);

  return (
    <>
      <div className={className}>
        {url ? (
          <button
            className="image-button"
            type="button"
            onClick={() => zoomable && setZoom(true)}
            aria-label={zoomable ? `Открыть фото: ${alt}` : alt}
          >
            <img src={url} alt={alt} loading="lazy" />
          </button>
        ) : (
          <div className="image-placeholder" aria-label="Фото готовится">
            <Logo size={30} />
          </div>
        )}
      </div>
      {zoom && url && <ZoomModal src={url} alt={alt} onClose={() => setZoom(false)} />}
    </>
  );
}
