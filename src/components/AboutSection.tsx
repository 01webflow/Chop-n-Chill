import { ArrowRight, Eye, Rotate3d } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { resolvePublicAssetUrl } from '../lib/assets';
import { GalleryItem } from '../types';

const LazyCulinaryShowcase3D = lazy(() => import('./three/CulinaryShowcase3D'));

interface AboutSectionProps {
  aboutImage: string;
  gallery?: GalleryItem[];
}

const ATMOSPHERE_PILLARS = [
  {
    title: '01. Indoor Dining',
    detail: 'Warm architectural lighting and comfortable seating suited for intimate dinners and family meals.',
  },
  {
    title: '02. Outdoor & Upstairs Terrace',
    detail: 'Breezy open-air tables and an elevated terrace setting made for relaxed evenings in Kasoa.',
  },
  {
    title: '03. Friendly Hospitality',
    detail: 'Attentive service built around welcoming guests for romantic dates, celebrations, and group hangouts.',
  },
  {
    title: '04. Dining & Entertainment',
    detail: 'Satisfying Ghanaian plates, grills, and drinks paired with weekend live-band energy.',
  },
];

export function AboutSection({ aboutImage, gallery = [] }: AboutSectionProps) {
  const [revealCloche, setRevealCloche] = useState(false);
  const [viewMode, setViewMode] = useState<'3d' | 'photo'>('photo');
  const shouldReduceMotion = useReducedMotion();

  const previewPhotos = useMemo(() => {
    const preferredIds = [
      'gal-interior-dining',
      'gal-interior-bar',
      'gal-patio-atmosphere',
      'gal-grill-pavilion',
    ];
    const picked = preferredIds
      .map((id) => gallery.find((g) => g.id === id))
      .filter((item): item is GalleryItem => Boolean(item));
    return picked.length > 0 ? picked : gallery.slice(0, 4);
  }, [gallery]);

  return (
    <section id="about" className="py-20 sm:py-28 bg-[#1C1C1C] border-y border-[#F8F4EC]/10">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 space-y-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
          {/* Interactive Photography & 3D Showcase Column */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 flex flex-col gap-3"
          >
            <div className="relative flex-1 min-h-[380px] sm:min-h-[460px] rounded-sm overflow-hidden border border-[#C9A45C]/30 bg-gradient-to-b from-[#171717] via-[#121212] to-[#0D0D0D]">
              {viewMode === '3d' ? (
                <Suspense
                  fallback={
                    <img
                      src={aboutImage}
                      alt="Daytime exterior and upstairs terrace view of Chop 'n Chill Restaurant & Lounge, Kasoa"
                      className="w-full h-full object-cover object-center"
                    />
                  }
                >
                  <LazyCulinaryShowcase3D revealCloche={revealCloche} fallbackImage={aboutImage} />
                </Suspense>
              ) : (
                <img
                  src={aboutImage}
                  alt="Daytime exterior and upstairs terrace view of Chop 'n Chill Restaurant & Lounge, Kasoa"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-center"
                />
              )}

              {/* Top Interactive Controls (outside/above canvas without backdrop-filter blur) */}
              <div className="absolute top-3.5 left-3.5 right-3.5 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                <div className="inline-flex items-center gap-1 p-1 rounded-sm bg-[#101010]/90 border border-[#C9A45C]/35 pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => setViewMode('photo')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors ${
                      viewMode === 'photo'
                        ? 'bg-[#C9A45C] text-[#101010]'
                        : 'text-[#C8BFA8] hover:text-[#F8F4EC]'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Terrace Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('3d')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors ${
                      viewMode === '3d'
                        ? 'bg-[#C9A45C] text-[#101010]'
                        : 'text-[#C8BFA8] hover:text-[#F8F4EC]'
                    }`}
                  >
                    <Rotate3d className="w-3.5 h-3.5" />
                    <span>3D Stage</span>
                  </button>
                </div>

                {viewMode === '3d' && (
                  <button
                    type="button"
                    onClick={() => setRevealCloche((r) => !r)}
                    className="pointer-events-auto px-3.5 py-2 rounded-sm bg-[#173C30] border border-[#C9A45C]/45 text-xs font-semibold uppercase tracking-[0.1em] text-[#DFC082] hover:bg-[#1E4D3E] transition-colors"
                  >
                    {revealCloche ? 'Lower Gold Cloche' : 'Reveal Cloche'}
                  </button>
                )}
              </div>

              <div
                className="absolute inset-x-0 bottom-0 p-5 pointer-events-none"
                style={{
                  background: 'linear-gradient(to top, rgba(16,16,16,0.94), rgba(16,16,16,0.38), transparent)',
                }}
              >
                <p className="text-xs text-[#DFC082] tracking-[0.06em]">
                  {viewMode === '3d'
                    ? 'Drag to rotate 3D Hospitality Craft · Hover or tap Reveal Cloche'
                    : "Chop 'n Chill Kasoa Courtyard & Upstairs Terrace · Archive photo (confirm rights before publication)"}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Editorial Storytelling Column */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A45C] mb-4">
              About Chop &apos;n Chill
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#F8F4EC] leading-[1.12] mb-6">
              MORE THAN A RESTAURANT. IT&apos;S AN EXPERIENCE.
            </h2>

            <div className="space-y-4 text-[#D8D0C0] text-base leading-relaxed mb-8">
              <p>
                Chop &apos;n Chill Restaurant &amp; Lounge is a Kasoa destination where memorable meals and unhurried social moments belong together. From generous Ghanaian classics and charcoal-grilled plates to chilled lounge drinks, every detail is shaped for comfort and enjoyment.
              </p>
              <p>
                Whether you are sharing dinner with family, meeting friends after work, planning a romantic evening, or gathering upstairs on the terrace for weekend live music, our spaces adapt effortlessly to your night.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 py-6 border-y border-[#F8F4EC]/12 mb-8">
              {ATMOSPHERE_PILLARS.map((item) => (
                <div key={item.title} className="group">
                  <h3 className="font-sans text-sm font-semibold text-[#F8F4EC] group-hover:text-[#DFC082] transition-colors mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#A9A191] leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/menu"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-sm bg-[#C9A45C] text-[#101010] text-xs font-semibold uppercase tracking-[0.15em] hover:bg-[#DFC082] hover:-translate-y-0.5 transition-all whitespace-nowrap shrink-0 min-h-[46px]"
              >
                Discover Chop &apos;n Chill
              </Link>
              <Link
                to="/gallery"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-sm border border-[#F8F4EC]/20 text-xs font-semibold uppercase tracking-[0.14em] text-[#DFC082] hover:border-[#C9A45C] transition-colors min-h-[46px]"
              >
                <span>Browse Venue Photos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Homepage Venue Atmosphere & Gallery Preview Strip */}
        {previewPhotos.length > 0 && (
          <div className="pt-10 border-t border-[#F8F4EC]/10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9A45C] mb-1.5">
                  Inside &amp; Outside Chop &apos;n Chill
                </p>
                <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#F8F4EC]">
                  Restaurant Atmosphere Preview
                </h3>
              </div>
              <Link
                to="/gallery"
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#DFC082] hover:underline whitespace-nowrap shrink-0"
              >
                <span>Open Full Gallery ({gallery.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {previewPhotos.map((photo) => (
                <Link
                  key={photo.id}
                  to="/gallery"
                  className="group relative aspect-[3/4] rounded-sm overflow-hidden border border-[#F8F4EC]/12 bg-[#121212] hover:border-[#C9A45C]/55 transition-colors"
                >
                  <img
                    src={resolvePublicAssetUrl(photo.image)}
                    alt={photo.alt || photo.title}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <div
                    className="absolute inset-0 flex flex-col justify-end p-3.5"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(16,16,16,0.92) 0%, rgba(16,16,16,0.22) 55%, transparent 100%)',
                    }}
                  >
                    <p className="text-[11px] text-[#C9A45C] truncate">{photo.category}</p>
                    <p className="font-display text-sm sm:text-base font-semibold text-[#F8F4EC] leading-snug line-clamp-2">
                      {photo.title}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
