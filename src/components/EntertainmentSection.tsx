import { Calendar, Clock, Music2 } from 'lucide-react';
import { EventItem } from '../types';

interface EntertainmentSectionProps {
  events: EventItem[];
  liveImage: string;
}

export function EntertainmentSection({ events, liveImage }: EntertainmentSectionProps) {
  return (
    <section
      id="entertainment"
      className="py-20 sm:py-28 border-y border-[#F8F4EC]/10"
      style={{
        background: 'linear-gradient(160deg, #173C30 0%, #11241E 45%, #101010 100%)',
      }}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Top Immersive Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch mb-16">
          <div className="lg:col-span-5 flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#DFC082] mb-4">
              Live Entertainment &amp; Lounge
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#F8F4EC] leading-[1.1] mb-5">
              WHERE GREAT FOOD MEETS GREAT MUSIC.
            </h2>
            <p className="text-base text-[#E2DDD0] leading-relaxed mb-7">
              Come for the food. Stay for the atmosphere. Experience memorable moments with music, great company and weekend live-band entertainment across our indoor lounge and open-air spaces.
            </p>
            <div className="text-sm text-[#DFC082] mb-8 space-y-1.5">
              <p>Weekend Live-Band Performances · Indoor &amp; Outdoor Lounge</p>
              <p>Group Hangouts · Celebrations · Evening Drinks &amp; Grills</p>
            </div>
            <div>
              <a
                href="#upcoming-events"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-sm bg-[#C9A45C] text-[#101010] text-xs font-semibold uppercase tracking-[0.15em] hover:bg-[#DFC082] transition-colors whitespace-nowrap shrink-0 min-h-[46px]"
              >
                Explore Upcoming Events
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="relative h-full min-h-[320px] sm:min-h-[400px] rounded-sm overflow-hidden border border-[#C9A45C]/30 bg-[#101010]">
              <img
                src={liveImage}
                alt="Illustrative live band lounge atmosphere concept"
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-x-0 bottom-0 p-5"
                style={{
                  background: 'linear-gradient(to top, rgba(16,16,16,0.9), transparent)',
                }}
              >
                <p className="text-xs text-[#DFC082]">
                  Live-Band Lounge Experience · Illustrative concept until venue photos are uploaded
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Editable Upcoming Events Board */}
        <div id="upcoming-events" className="pt-12 border-t border-[#F8F4EC]/15">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#F8F4EC] mb-2">
                Upcoming Events &amp; Live Sessions
              </h3>
              <p className="text-sm text-[#C8BFA8]">
                Unverified dates are never fabricated—slots below are editable by Chop 'n Chill management as schedules are confirmed.
              </p>
            </div>
            <a
              href="tel:+233554903755"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-[#DFC082] hover:underline whitespace-nowrap shrink-0"
            >
              Confirm Weekend Lineup: +233 55 490 3755
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((ev) => (
              <article
                key={ev.id}
                className="flex flex-col sm:flex-row gap-5 p-5 rounded-sm bg-[#101010]/80 border border-[#C9A45C]/25"
              >
                <div className="sm:w-44 aspect-[4/3] sm:aspect-auto sm:h-auto shrink-0 rounded-sm overflow-hidden bg-[#1C1C1C]">
                  {ev.promoImage ? (
                    <img
                      src={ev.promoImage}
                      alt={ev.title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full min-h-[120px] flex items-center justify-center text-[#C9A45C]">
                      <Music2 className="w-7 h-7" />
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#DFC082] mb-2">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {ev.date}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {ev.startTime}
                      </span>
                    </div>
                    <h4 className="font-display text-xl font-semibold text-[#F8F4EC] mb-1.5">
                      {ev.title}
                    </h4>
                    <p className="text-xs text-[#C9A45C] mb-2">Featured: {ev.performers}</p>
                    <p className="text-sm text-[#B8B0A0] leading-relaxed">{ev.description}</p>
                  </div>

                  <div>
                    <a
                      href="#reservations"
                      className="inline-flex items-center justify-center px-4 py-2 rounded-sm border border-[#C9A45C]/45 text-xs font-semibold uppercase tracking-[0.12em] text-[#F8F4EC] hover:bg-[#C9A45C] hover:text-[#101010] transition-colors whitespace-nowrap shrink-0 min-h-[38px]"
                    >
                      Request Table
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
