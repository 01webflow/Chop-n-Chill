import { MapPin, MessageCircle, Navigation, Phone } from 'lucide-react';
import { RestaurantSettings } from '../types';

interface ContactSectionProps {
  settings: RestaurantSettings;
}

export function ContactSection({ settings }: ContactSectionProps) {
  const configuredSocials = settings.socials.filter((s) => s.url && s.url.trim().length > 0);

  return (
    <section id="contact" className="py-20 sm:py-28 bg-[#101010]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A45C] mb-3">
            Location &amp; Contact
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#F8F4EC]">
            WE'RE READY TO WELCOME YOU.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-5 p-6 sm:p-8 rounded-sm bg-[#1C1C1C] border border-[#C9A45C]/25 flex flex-col justify-between gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="font-display text-2xl font-semibold text-[#F8F4EC]">
                  {settings.businessName}
                </h3>
                <p className="text-xs text-[#C9A45C] mt-1">
                  Restaurant · Dining · Entertainment &amp; Lounge
                </p>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#9A9282] mb-1">Location</p>
                  <p className="text-[#F8F4EC] inline-flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#C9A45C] shrink-0" />
                    <span>{settings.address}</span>
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#9A9282] mb-1">Telephone</p>
                  <a
                    href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                    className="text-[#DFC082] hover:underline font-medium tabular-nums"
                  >
                    {settings.phone}
                  </a>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#9A9282] mb-1">Services</p>
                  <p className="text-[#D8D0C0]">{settings.deliveryNote}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#9A9282] mb-1">
                    Opening Hours (Editable)
                  </p>
                  <p className="text-[#D8D0C0]">{settings.openingHours}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#9A9282] mb-1">
                    Social Channels
                  </p>
                  {configuredSocials.length > 0 ? (
                    <div className="flex flex-wrap gap-4">
                      {configuredSocials.map((soc) => (
                        <a
                          key={soc.id}
                          href={soc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#DFC082] hover:underline"
                        >
                          {soc.label}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#9A9282]">
                      Social media links can be configured in the Owner Portal.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t border-[#F8F4EC]/10">
              <a
                href={settings.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-sm bg-[#C9A45C] text-[#101010] text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#DFC082] min-h-[44px]"
              >
                <Navigation className="w-4 h-4" />
                <span>Get Directions</span>
              </a>
              <a
                href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-sm border border-[#C9A45C]/45 text-xs font-semibold uppercase tracking-[0.14em] text-[#F8F4EC] hover:border-[#C9A45C] min-h-[44px]"
              >
                <Phone className="w-4 h-4 text-[#C9A45C]" />
                <span>Call Now</span>
              </a>
              <a
                href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
                  "Hello Chop 'n Chill Kasoa, I have a general question."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-sm bg-[#173C30] border border-[#C9A45C]/30 text-xs font-semibold uppercase tracking-[0.14em] text-[#F8F4EC] hover:bg-[#1E4D3E] min-h-[44px]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-7 min-h-[380px] rounded-sm overflow-hidden border border-[#C9A45C]/25 bg-[#1C1C1C]">
            <iframe
              title="Chop 'n Chill Restaurant & Lounge Kasoa Location Map"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://maps.google.com/maps?q=HH3J%2BG5M,+Kasoa,+Ghana&t=&z=15&ie=UTF8&iwloc=&output=embed"
              className="w-full h-full min-h-[380px] border-0"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
