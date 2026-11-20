interface AboutSectionProps {
  aboutImage: string;
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

export function AboutSection({ aboutImage }: AboutSectionProps) {
  return (
    <section id="about" className="py-20 sm:py-28 bg-[#1C1C1C] border-y border-[#F8F4EC]/10">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
        {/* Photography Column */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="relative flex-1 min-h-[380px] sm:min-h-[460px] rounded-sm overflow-hidden border border-[#C9A45C]/25 bg-[#141414]">
            <img
              src={aboutImage}
              alt="Illustrative indoor dining and upstairs terrace atmosphere concept for Chop 'n Chill"
              referrerPolicy="no-referrer"
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-x-0 bottom-0 p-5"
              style={{
                background: 'linear-gradient(to top, rgba(16,16,16,0.92), rgba(16,16,16,0.35), transparent)',
              }}
            >
              <p className="text-xs text-[#DFC082] tracking-[0.06em]">
                Indoor Dining · Outdoor Patio · Upstairs Terrace (Illustrative Concept)
              </p>
            </div>
          </div>
        </div>

        {/* Editorial Storytelling Column */}
        <div className="lg:col-span-6 flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A45C] mb-4">
            About Chop 'n Chill
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#F8F4EC] leading-[1.12] mb-6">
            MORE THAN A RESTAURANT. IT'S AN EXPERIENCE.
          </h2>

          <div className="space-y-4 text-[#D8D0C0] text-base leading-relaxed mb-8">
            <p>
              Chop 'n Chill Restaurant &amp; Lounge is a Kasoa destination where memorable meals and unhurried social moments belong together. From generous Ghanaian classics and charcoal-grilled plates to chilled lounge drinks, every detail is shaped for comfort and enjoyment.
            </p>
            <p>
              Whether you are sharing dinner with family, meeting friends after work, planning a romantic evening, or gathering upstairs on the terrace for weekend live music, our spaces adapt effortlessly to your night.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 py-6 border-y border-[#F8F4EC]/12 mb-8">
            {ATMOSPHERE_PILLARS.map((item) => (
              <div key={item.title}>
                <h3 className="font-sans text-sm font-semibold text-[#F8F4EC] mb-1.5">{item.title}</h3>
                <p className="text-sm text-[#A9A191] leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>

          <div>
            <a
              href="#menu"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-sm bg-[#C9A45C] text-[#101010] text-xs font-semibold uppercase tracking-[0.15em] hover:bg-[#DFC082] transition-colors whitespace-nowrap shrink-0 min-h-[46px]"
            >
              Discover Chop 'n Chill
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
