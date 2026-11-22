import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RestaurantSettings } from '../types';

interface FooterProps {
  settings: RestaurantSettings;
  onOpenAdmin: () => void;
}

export function Footer({ settings, onOpenAdmin }: FooterProps) {
  const configuredSocials = settings.socials.filter((s) => s.url && s.url.trim().length > 0);

  return (
    <footer className="bg-[#0B0B0B] border-t border-[#C9A45C]/20 py-14 text-sm text-[#9A9282]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-[#F8F4EC]/10">
          <div>
            <p className="font-display text-2xl text-[#F8F4EC] mb-2">Chop 'n Chill</p>
            <p className="text-[#C8BFA8]">{settings.businessName}</p>
            <p className="mt-1">{settings.address}</p>
            <p className="mt-1">
              <a href={`tel:${settings.phone.replace(/\s+/g, '')}`} className="text-[#DFC082] hover:underline">
                {settings.phone}
              </a>
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#C9A45C] font-semibold mb-3">
              Navigation
            </p>
            <ul className="space-y-2">
              <li><Link to="/" className="hover:text-[#F8F4EC]">Home</Link></li>
              <li><Link to="/about" className="hover:text-[#F8F4EC]">About Us</Link></li>
              <li><Link to="/menu" className="hover:text-[#F8F4EC]">Our Menu</Link></li>
              <li><Link to="/live-band" className="hover:text-[#F8F4EC]">Live Entertainment</Link></li>
              <li><Link to="/gallery" className="hover:text-[#F8F4EC]">Photo Gallery</Link></li>
              <li><Link to="/reservations" className="hover:text-[#F8F4EC]">Reservations</Link></li>
              <li><Link to="/faq" className="hover:text-[#F8F4EC]">FAQ</Link></li>
            </ul>
          </div>

          <div className="flex flex-col justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#C9A45C] font-semibold mb-3">
                Connect &amp; Operations
              </p>
              {configuredSocials.length > 0 ? (
                <div className="flex flex-wrap gap-4 mb-4">
                  {configuredSocials.map((s) => (
                    <a
                      key={s.id}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#C8BFA8] hover:text-[#DFC082]"
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#9A9282] mb-4">
                  Social links editable by management inside the portal.
                </p>
              )}
              <button
                type="button"
                onClick={onOpenAdmin}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-[#C9A45C]/35 text-xs font-semibold uppercase tracking-[0.12em] text-[#DFC082] hover:border-[#C9A45C] hover:bg-[#1C1C1C] transition-colors min-h-[42px]"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Staff &amp; Owner Portal</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <p>&copy; {new Date().getFullYear()} {settings.businessName}. Kasoa, Ghana.</p>
          <p>Unconfirmed prices and schedules remain clearly marked as editable placeholders.</p>
        </div>
      </div>
    </footer>
  );
}
