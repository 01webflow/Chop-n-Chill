import { ArrowUpRight, Star } from 'lucide-react';

interface TestimonialsSectionProps {
  googleMapsUrl: string;
}

const VERIFIED_THEMES = [
  {
    title: '01. Signature Dishes',
    summary:
      'Guests frequently highlight the Banku with grilled fish, Assorted fried rice, Assorted jollof rice, Chicken kebab, and Samosas as standouts.',
  },
  {
    title: '02. Friendly & Welcoming Atmosphere',
    summary:
      'Visitors describe a warm hospitality culture that feels comfortable for family dinners, romantic dates, and first-time guests.',
  },
  {
    title: '03. Weekend Live-Band Entertainment',
    summary:
      'Live music sessions elevate weekend evenings, turning dinner at Chop \'n Chill into an engaging social experience.',
  },
  {
    title: '04. Relaxing Environment for Friends',
    summary:
      'Indoor dining, outdoor seating, and the upstairs terrace give groups of friends a relaxed spot to meet and unwind in Kasoa.',
  },
];

export function TestimonialsSection({ googleMapsUrl }: TestimonialsSectionProps) {
  return (
    <section id="testimonials" className="py-20 sm:py-28 bg-[#101010] border-t border-[#F8F4EC]/10">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-10 border-b border-[#F8F4EC]/12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A45C] mb-3">
              Guest Impressions
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#F8F4EC] mb-4">
              LOVED BY GUESTS IN KASOA
            </h2>
            <p className="text-[#C8BFA8] max-w-2xl text-base">
              Summarized from themes across verified Google reviews. To preserve authenticity, no customer names or quotes are invented—read original guest reviews directly on Google Maps.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-6 shrink-0 bg-[#1C1C1C] border border-[#C9A45C]/30 rounded-sm p-6">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl sm:text-5xl font-semibold text-[#C9A45C] tabular-nums">
                  4.1
                </span>
                <span className="text-lg text-[#C8BFA8] tabular-nums">/ 5</span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-[#C9A45C]" aria-label="4.1 out of 5 stars">
                <Star className="w-4 h-4 fill-[#C9A45C]" />
                <Star className="w-4 h-4 fill-[#C9A45C]" />
                <Star className="w-4 h-4 fill-[#C9A45C]" />
                <Star className="w-4 h-4 fill-[#C9A45C]" />
                <Star className="w-4 h-4 text-[#C9A45C]/45" />
              </div>
              <p className="text-xs text-[#C8BFA8] mt-1.5 tabular-nums">185 Google reviews</p>
            </div>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-sm bg-[#C9A45C] text-[#101010] text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#DFC082] transition-colors whitespace-nowrap shrink-0 min-h-[46px]"
            >
              <span>Read More Google Reviews</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-10">
          {VERIFIED_THEMES.map((theme) => (
            <div key={theme.title} className="space-y-2.5">
              <h3 className="font-display text-xl font-semibold text-[#F8F4EC]">{theme.title}</h3>
              <p className="text-sm text-[#B8B0A0] leading-relaxed">{theme.summary}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
