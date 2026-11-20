import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { GalleryItem } from '../types';

interface GallerySectionProps {
  gallery: GalleryItem[];
}

export function GallerySection({ gallery }: GallerySectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(gallery.map((g) => g.category)));
    return ['All', ...unique];
  }, [gallery]);

  const visibleItems = useMemo(() => {
    if (selectedCategory === 'All') return gallery;
    return gallery.filter((g) => g.category === selectedCategory);
  }, [gallery, selectedCategory]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev === null ? null : (prev + 1) % visibleItems.length));
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) =>
          prev === null ? null : (prev - 1 + visibleItems.length) % visibleItems.length
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIndex, visibleItems.length]);

  const activeItem = lightboxIndex !== null ? visibleItems[lightboxIndex] : null;

  return (
    <section id="gallery" className="py-20 sm:py-28 bg-[#1C1C1C]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A45C] mb-3">
              Photo Gallery
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#F8F4EC] mb-4">
              SPACES, PLATES &amp; EVENING ENERGY
            </h2>
            <p className="text-[#C8BFA8] max-w-2xl text-base">
              Preview our dining spaces, signature plates, and live-band ambience. Slots marked illustrative can be replaced with Chop 'n Chill's on-site photographs anytime in the Staff &amp; Owner Portal.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Gallery Category Filter"
            className="flex flex-wrap gap-1.5 p-1.5 rounded-sm bg-[#101010] border border-[#F8F4EC]/10"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={selectedCategory === cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setLightboxIndex(null);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
                  selectedCategory === cat
                    ? 'bg-[#C9A45C] text-[#101010] font-semibold'
                    : 'text-[#C8BFA8] hover:text-[#F8F4EC]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Editorial Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleItems.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLightboxIndex(idx)}
              className={`group relative text-left rounded-sm overflow-hidden border border-[#F8F4EC]/12 bg-[#121212] focus-visible:ring-2 focus-visible:ring-[#C9A45C] ${
                idx === 0 && visibleItems.length >= 4 ? 'sm:col-span-2 aspect-[16/9] sm:aspect-[2/1]' : 'aspect-[4/3]'
              }`}
            >
              <img
                src={item.image}
                alt={item.title}
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <div
                className="absolute inset-0 flex flex-col justify-between p-5"
                style={{
                  background:
                    'linear-gradient(to top, rgba(16,16,16,0.92) 0%, rgba(16,16,16,0.22) 55%, transparent 100%)',
                }}
              >
                <div className="flex justify-end">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-sm bg-[#101010]/70 border border-[#F8F4EC]/20 text-[#F8F4EC] opacity-0 group-hover:opacity-100 transition-opacity">
                    <Expand className="w-4 h-4" />
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[#C9A45C] mb-1">
                    <span>{item.category}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{item.isVerifiedVenuePhoto ? 'Verified Venue Photo' : 'Illustrative Concept'}</span>
                  </p>
                  <h3 className="font-display text-lg sm:text-xl font-semibold text-[#F8F4EC]">
                    {item.title}
                  </h3>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {activeItem && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={activeItem.title}
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="max-w-4xl w-full bg-[#181818] border border-[#C9A45C]/30 rounded-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F8F4EC]/10">
              <div>
                <p className="text-xs text-[#C9A45C]">
                  {activeItem.category} ·{' '}
                  {activeItem.isVerifiedVenuePhoto ? 'Verified Venue Photo' : 'Illustrative Concept'}
                </p>
                <h3 className="font-display text-lg text-[#F8F4EC]">{activeItem.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                aria-label="Close lightbox"
                className="w-10 h-10 inline-flex items-center justify-center rounded-sm border border-[#F8F4EC]/15 text-[#F8F4EC] hover:border-[#C9A45C]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-[#101010] max-h-[68vh] flex items-center justify-center overflow-hidden">
              <img
                src={activeItem.image}
                alt={activeItem.title}
                referrerPolicy="no-referrer"
                className="max-h-[68vh] w-auto object-contain"
              />
              {visibleItems.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() =>
                      setLightboxIndex((lightboxIndex - 1 + visibleItems.length) % visibleItems.length)
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-sm bg-[#101010]/80 border border-[#C9A45C]/40 text-[#F8F4EC] inline-flex items-center justify-center hover:bg-[#C9A45C] hover:text-[#101010]"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() => setLightboxIndex((lightboxIndex + 1) % visibleItems.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-sm bg-[#101010]/80 border border-[#C9A45C]/40 text-[#F8F4EC] inline-flex items-center justify-center hover:bg-[#C9A45C] hover:text-[#101010]"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            <div className="px-5 py-4 flex items-center justify-between gap-4 text-sm text-[#C8BFA8]">
              <p>{activeItem.caption}</p>
              <span className="font-mono text-xs text-[#9A9282] tabular-nums shrink-0">
                {lightboxIndex + 1} / {visibleItems.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
