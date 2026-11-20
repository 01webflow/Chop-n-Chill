import { MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { RestaurantSettings } from '../types';

interface HeroSectionProps {
  settings: RestaurantSettings;
  heroImage: string;
}

export function HeroSection({ settings, heroImage }: HeroSectionProps) {
  return (
    <section
      id="home"
      className="relative min-h-[100svh] flex flex-col justify-end pt-28 pb-12 sm:pb-16 overflow-hidden bg-[#101010]"
    >
      {/* Full-bleed Architectural Night Backdrop */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Illustrative architectural night exterior concept for Chop 'n Chill Restaurant & Lounge, Kasoa"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(16,16,16,0.68) 0%, rgba(16,16,16,0.48) 38%, rgba(16,16,16,0.92) 84%, #101010 100%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl"
        >
          <p className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium tracking-[0.16em] uppercase text-[#DFC082] mb-5">
            <MapPin className="w-4 h-4 text-[#C9A45C]" aria-hidden="true" />
            <span>Kasoa, Ghana</span>
            <span aria-hidden="true">·</span>
            <span>{settings.address}</span>
          </p>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[#F8F4EC] leading-[1.08] mb-6">
            GOOD FOOD. GREAT VIBES. UNFORGETTABLE MOMENTS.
          </h1>

          <p className="text-base sm:text-lg text-[#E6DFD1] max-w-2xl leading-relaxed mb-9">
            Discover the perfect blend of delicious dining, relaxing ambience and unforgettable entertainment at Chop 'n Chill, Kasoa.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <a
              href="#menu"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-sm bg-[#C9A45C] text-[#101010] text-xs font-semibold uppercase tracking-[0.15em] hover:bg-[#DFC082] transition-colors whitespace-nowrap shrink-0 min-h-[48px]"
            >
              Explore Our Menu
            </a>
            <a
              href="#reservations"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-sm border border-[#F8F4EC]/40 bg-[#101010]/55 text-[#F8F4EC] text-xs font-semibold uppercase tracking-[0.15em] hover:border-[#C9A45C] hover:text-[#DFC082] transition-colors whitespace-nowrap shrink-0 min-h-[48px]"
            >
              Reserve Your Table
            </a>
          </div>
        </motion.div>

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
      </div>
    </section>
  );
}
