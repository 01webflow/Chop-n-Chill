import { MapPin, Sparkles } from 'lucide-react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { RestaurantSettings } from '../types';

const LazyHero3DScene = lazy(() => import('./three/Hero3DScene'));

const HERO_3D_FALLBACK_IMAGE = '/src/assets/images/about_terrace_dining_1795211571923.jpg';

interface HeroSectionProps {
  settings: RestaurantSettings;
  heroImage: string;
  onOpenConcierge: () => void;
}

export function HeroSection({ settings, heroImage, onOpenConcierge }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? ['0%', '0%'] : ['0%', '14%']);
  const contentY = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? ['0px', '0px'] : ['0px', '28px']);

  return (
    <section
      ref={sectionRef}
      id="home"
      className="relative min-h-[100svh] flex flex-col justify-end pt-28 pb-12 sm:pb-16 overflow-hidden bg-[#101010]"
    >
      {/* Full-bleed Architectural Night Backdrop with Subtle Scroll Parallax */}
      <motion.div style={{ y: bgY }} className="absolute inset-0">
        <img
          src={heroImage}
          alt="Illustrative architectural night exterior concept for Chop 'n Chill Restaurant & Lounge, Kasoa"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center scale-[1.04]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(16,16,16,0.72) 0%, rgba(16,16,16,0.46) 36%, rgba(16,16,16,0.92) 84%, #101010 100%)',
          }}
        />
      </motion.div>

      {/* Subtle Ambient Left-Right Scrim so typography stays crisp beside 3D sculpture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 75% 42%, rgba(201,164,92,0.12) 0%, rgba(23,60,48,0.14) 36%, transparent 68%)',
        }}
      />

      {/* Lazy-Loaded Interactive 3D Centerpiece mounted ONLY on Desktop (lg+) so mobile never loads WebGL/Three chunks */}
      {isDesktop && (
        <div className="hidden lg:block absolute right-4 xl:right-12 top-20 bottom-36 w-[44%] max-w-[600px] z-[12] pointer-events-auto">
          <Suspense
            fallback={
              <div className="relative w-full h-full rounded-sm overflow-hidden border border-[#C9A45C]/30 bg-[#141414] shadow-2xl">
                <img
                  src={HERO_3D_FALLBACK_IMAGE}
                  alt="Chop 'n Chill Kasoa upstairs terrace and evening lounge atmosphere"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center opacity-85"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(16,16,16,0.2) 0%, rgba(16,16,16,0.88) 100%)',
                  }}
                />
              </div>
            }
          >
            <LazyHero3DScene
              fallbackImage={HERO_3D_FALLBACK_IMAGE}
              fallbackAlt="Chop 'n Chill Kasoa upstairs terrace and evening lounge atmosphere"
              className="w-full h-full"
            />
          </Suspense>
        </div>
      )}

      <motion.div style={{ y: contentY }} className="relative z-10 max-w-7xl mx-auto w-full px-5 sm:px-8 pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl xl:max-w-3xl"
        >
          <p className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium tracking-[0.16em] uppercase text-[#DFC082] mb-5">
            <MapPin className="w-4 h-4 text-[#C9A45C]" aria-hidden="true" />
            <span>Kasoa, Ghana</span>
            <span aria-hidden="true">·</span>
            <span>{settings.address}</span>
          </p>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[#F8F4EC] leading-[1.06] mb-6">
            GOOD FOOD. GREAT VIBES. UNFORGETTABLE MOMENTS.
          </h1>

          <p className="text-base sm:text-lg text-[#E6DFD1] max-w-xl leading-relaxed mb-9">
            Discover the perfect blend of delicious dining, relaxing ambience and unforgettable entertainment at Chop &apos;n Chill, Kasoa.
          </p>

          <div className="flex flex-wrap items-center gap-3.5">
            <a
              href="#menu"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-sm bg-[#C9A45C] text-[#101010] text-xs font-semibold uppercase tracking-[0.15em] hover:bg-[#DFC082] hover:-translate-y-0.5 transition-all whitespace-nowrap shrink-0 min-h-[48px]"
            >
              Explore Our Menu
            </a>
            <a
              href="#reservations"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-sm border border-[#F8F4EC]/40 bg-[#101010]/70 text-[#F8F4EC] text-xs font-semibold uppercase tracking-[0.15em] hover:border-[#C9A45C] hover:text-[#DFC082] hover:-translate-y-0.5 transition-all whitespace-nowrap shrink-0 min-h-[48px]"
            >
              Reserve Your Table
            </a>
            <button
              type="button"
              onClick={onOpenConcierge}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-sm border border-[#C9A45C]/50 bg-[#173C30]/80 text-[#F8F4EC] text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#1E4D3E] hover:border-[#DFC082] hover:-translate-y-0.5 transition-all whitespace-nowrap shrink-0 min-h-[48px]"
            >
              <Sparkles className="w-4 h-4 text-[#DFC082]" />
              <span>AI Concierge</span>
            </button>
          </div>
        </motion.div>

        {/* Static Mobile & Tablet Lounge Fallback Card (zero 3D/WebGL overhead on mobile viewports) */}
        <div className="mt-8 lg:hidden relative rounded-sm overflow-hidden border border-[#C9A45C]/30 bg-[#141414] shadow-xl">
          <img
            src={HERO_3D_FALLBACK_IMAGE}
            alt="Chop 'n Chill Kasoa upstairs terrace and evening lounge ambience"
            referrerPolicy="no-referrer"
            className="w-full h-44 sm:h-56 object-cover object-center"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(16,16,16,0.12) 0%, rgba(16,16,16,0.45) 55%, rgba(16,16,16,0.92) 100%)',
            }}
          />
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#C9A45C]">
                Upstairs Terrace &amp; Lounge
              </p>
              <p className="text-xs text-[#E6DFD1]">
                Afro-modern dining &amp; weekend live-band vibes
              </p>
            </div>
          </div>
        </div>

        {/* Full-width summary strip */}
        <div className="mt-12 pt-7 border-t border-[#F8F4EC]/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#C9A45C] mb-1">Services</p>
            <p className="text-[#F8F4EC] font-medium">Dine-in · Takeaway · Delivery</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#C9A45C] mb-1">Spaces</p>
            <p className="text-[#F8F4EC] font-medium">Indoor · Outdoor · Upstairs Terrace</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#C9A45C] mb-1">Google Rating</p>
            <p className="text-[#F8F4EC] font-medium tabular-nums">4.1 / 5 across 185 reviews</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#C9A45C] mb-1">Reservations &amp; Orders</p>
            <a href="tel:+233554903755" className="text-[#F8F4EC] hover:text-[#DFC082] font-medium tabular-nums">
              {settings.phone}
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
