import { ImageOff } from 'lucide-react';
import { ImgHTMLAttributes, useEffect, useRef, useState } from 'react';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  rootMargin?: string;
  threshold?: number;
  wrapperClassName?: string;
  placeholderClassName?: string;
}

export function LazyImage({
  src,
  alt,
  className = '',
  wrapperClassName = 'w-full h-full',
  placeholderClassName = '',
  rootMargin = '150px 0px',
  threshold = 0.01,
  ...imgProps
}: LazyImageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [inView, setInView] = useState<boolean>(
    () => typeof IntersectionObserver === 'undefined'
  );
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  useEffect(() => {
    if (inView) return;
    const node = containerRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, rootMargin, threshold]);

  useEffect(() => {
    if (!inView || !src) return;
    const img = imgRef.current;
    if (img && img.complete) {
      if (img.naturalWidth > 0) {
        setLoaded(true);
      } else {
        setFailed(true);
      }
    }
  }, [inView, src]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-[#141414] ${wrapperClassName}`}>
      {!loaded && !failed && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 bg-gradient-to-br from-[#1B1B1B] via-[#151515] to-[#1F1A12] animate-pulse motion-reduce:animate-none ${placeholderClassName}`}
        />
      )}

      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-[#9A9282] bg-[#141414]">
          <ImageOff className="w-5 h-5 text-[#C9A45C]/60 mb-1.5" />
          <span className="text-[11px] uppercase tracking-[0.12em]">Photo Unavailable</span>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={inView ? src : undefined}
          data-src={!inView ? src : undefined}
          alt={alt}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setFailed(true);
            setLoaded(true);
          }}
          className={`${className} transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...imgProps}
        />
      )}
    </div>
  );
}
