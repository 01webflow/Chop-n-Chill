import { ChevronLeft, ChevronRight, Expand, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { resolvePublicAssetUrl } from '../lib/assets';
import { GalleryItem } from '../types';

interface GallerySectionProps {
  gallery: GalleryItem[];
}

export function GallerySection({ gallery }: GallerySectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of gallery) {
      counts.set(item.category, (counts.get(item.category) || 0) + 1);
    }
    const ordered = Array.from(counts.keys());
    return [
      { label: 'All', count: gallery.length },
      ...ordered.map((cat) => ({ label: cat, count: counts.get(cat) || 0 })),
    ];
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

  const getAspectClass = (item: GalleryItem) => {
    if (item.orientation === 'portrait') return 'aspect-[3/4]';
    if (item.orientation === 'square') return 'aspect-square';
    return 'aspect-[4/3]';
  };

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
            <p className="text-[#C8BFA8] max-w-2xl text-base leading-relaxed">
              Authentic venue, interior, terrace, drinks, and live-band photographs from Chop &apos;n Chill Kasoa. Photos sourced from the Restaurant Guru / Google archive are flagged for owner usage-rights confirmation before commercial publication.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Gallery Category Filter"
            className="flex flex-wrap gap-1.5 p-1.5 rounded-sm bg-[#101010] border border-[#F8F4EC]/10"
          >
            {categories.map(({ label, count }) => (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={selectedCategory === label}
                onClick={() => {
                  setSelectedCategory(label);
                  setLightboxIndex(null);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
                  selectedCategory === label
                    ? 'bg-[#C9A45C] text-[#101010] font-semibold'
                    : 'text-[#C8BFA8] hover:text-[#F8F4EC]'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* Responsive Masonry Layout Preserving Portrait & Landscape Aspect Ratios */}
        {visibleItems.length === 0 ? (
          <div className="py-16 text-center border border-[#F8F4EC]/10 rounded-sm bg-[#141414] text-sm text-[#C8BFA8]">
            No photographs are assigned to this category yet. Upload verified venue photos in the Staff &amp; Owner Portal.
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
            {visibleItems.map((item, idx) => (
              <motion.button
                key={item.id}
                type="button"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.4, delay: Math.min(idx * 0.04, 0.2) }}
                onClick={() => setLightboxIndex(idx)}
                className={`group relative block w-full break-inside-avoid text-left rounded-sm overflow-hidden border border-[#F8F4EC]/12 bg-[#121212] hover:border-[#C9A45C]/55 focus-visible:ring-2 focus-visible:ring-[#C9A45C] transition-colors ${getAspectClass(
                  item
                )}`}
              >
                <img
                  src={resolvePublicAssetUrl(item.image)}
                  alt={item.alt || item.title}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div
                  className="absolute inset-0 flex flex-col justify-between p-5"
                  style={{
                    background:
                      'linear-gradient(to top, rgba(16,16,16,0.92) 0%, rgba(16,16,16,0.22) 55%, rgba(16,16,16,0.18) 100%)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] font-medium uppercase tracking-[0.1em] border ${
                        item.isVerifiedVenuePhoto && !item.requiresPermission
                          ? 'bg-[#173C30]/85 border-[#34D399]/40 text-[#6EE7B7]'
                          : 'bg-[#101010]/80 border-[#C9A45C]/35 text-[#DFC082]'
                      }`}
                    >
                      {item.isVerifiedVenuePhoto && !item.requiresPermission ? (
                        <>
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified Venue Photo</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3 h-3" />
                          <span>Rights Confirmation Needed</span>
                        </>
                      )}
                    </span>

                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-sm bg-[#101010]/75 border border-[#F8F4EC]/20 text-[#F8F4EC] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Expand className="w-4 h-4" />
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-[#C9A45C] mb-1">{item.category}</p>
                    <h3 className="font-display text-lg sm:text-xl font-semibold text-[#F8F4EC] leading-snug">
                      {item.title}
                    </h3>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal with Uncropped View, Keyboard/Button Nav & Thumbnail Strip */}
      {activeItem && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={activeItem.title}
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="max-w-5xl w-full bg-[#181818] border border-[#C9A45C]/35 rounded-sm overflow-hidden shadow-2xl flex flex-col max-h-[94vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-[#F8F4EC]/10 shrink-0">
              <div className="min-w-0">
                <p className="text-xs text-[#C9A45C] truncate">
                  {activeItem.category} ·{' '}
                  {activeItem.isVerifiedVenuePhoto && !activeItem.requiresPermission
                    ? 'Verified Venue Photo'
                    : 'Archive Photo · Confirm Owner Usage Rights'}
                </p>
                <h3 className="font-display text-base sm:text-lg text-[#F8F4EC] truncate">
                  {activeItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                aria-label="Close lightbox"
                className="w-10 h-10 inline-flex items-center justify-center rounded-sm border border-[#F8F4EC]/15 text-[#F8F4EC] hover:border-[#C9A45C] shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-[#101010] flex-1 min-h-[260px] max-h-[62vh] flex items-center justify-center overflow-hidden">
              <img
                key={activeItem.id}
                src={resolvePublicAssetUrl(activeItem.image)}
                alt={activeItem.alt || activeItem.title}
                referrerPolicy="no-referrer"
                className="max-h-[62vh] w-auto max-w-full object-contain transition-opacity duration-300"
              />
              {visibleItems.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() =>
                      setLightboxIndex((lightboxIndex - 1 + visibleItems.length) % visibleItems.length)
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-sm bg-[#101010]/85 border border-[#C9A45C]/45 text-[#F8F4EC] inline-flex items-center justify-center hover:bg-[#C9A45C] hover:text-[#101010] transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() => setLightboxIndex((lightboxIndex + 1) % visibleItems.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-sm bg-[#101010]/85 border border-[#C9A45C]/45 text-[#F8F4EC] inline-flex items-center justify-center hover:bg-[#C9A45C] hover:text-[#101010] transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            <div className="px-4 sm:px-5 py-3 border-t border-[#F8F4EC]/10 space-y-3 shrink-0 bg-[#151515]">
              <div className="flex items-start justify-between gap-4 text-xs sm:text-sm text-[#C8BFA8]">
                <div>
                  <p>{activeItem.caption}</p>
                  {activeItem.sourceNote && (
                    <p className="text-[11px] text-[#9A9282] mt-0.5">Source: {activeItem.sourceNote}</p>
                  )}
                </div>
                <span className="font-mono text-xs text-[#DFC082] tabular-nums shrink-0">
                  {lightboxIndex + 1} / {visibleItems.length}
                </span>
              </div>

              {visibleItems.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {visibleItems.map((thumb, tIdx) => (
                    <button
                      key={thumb.id}
                      type="button"
                      onClick={() => setLightboxIndex(tIdx)}
                      aria-label={`View ${thumb.title}`}
                      className={`relative w-14 h-11 rounded-sm overflow-hidden shrink-0 border transition-all ${
                        tIdx === lightboxIndex
                          ? 'border-[#C9A45C] ring-1 ring-[#C9A45C]'
                          : 'border-[#F8F4EC]/15 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={resolvePublicAssetUrl(thumb.image)}
                        alt=""
                        className="w-full h-full object-cover object-center"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
