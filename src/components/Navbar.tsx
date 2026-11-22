import { Menu, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface NavbarProps {
  onOpenReserve: () => void;
  onOpenConcierge: () => void;
}

const NAV_LINKS = [
  { href: '#about', label: 'About' },
  { href: '#menu', label: 'Our Menu' },
  { href: '#gallery', label: 'Gallery' },
  { href: '#entertainment', label: 'Live Band' },
  { href: '#faq', label: 'FAQ' },
  { href: '#contact', label: 'Contact' },
];

export function Navbar({ onOpenReserve, onOpenConcierge }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-200 ${
          scrolled
            ? 'bg-[#101010]/92 backdrop-blur-md border-b border-[#C9A45C]/25 py-3 shadow-xl'
            : 'bg-gradient-to-b from-[#101010]/88 to-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between gap-6">
          <a
            href="#home"
            className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[#F8F4EC] whitespace-nowrap shrink-0"
          >
            Chop &apos;n Chill
          </a>

          <nav aria-label="Primary Navigation" className="hidden lg:flex items-center gap-6">
            <a
              href="#home"
              className="text-sm font-medium text-[#C8BFA8] hover:text-[#C9A45C] transition-colors whitespace-nowrap shrink-0 underline-offset-8 hover:underline"
            >
              Home
            </a>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#C8BFA8] hover:text-[#C9A45C] transition-colors whitespace-nowrap shrink-0 underline-offset-8 hover:underline"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenConcierge}
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-sm border border-[#C9A45C]/40 bg-[#173C30]/60 text-[#DFC082] text-xs font-semibold uppercase tracking-[0.12em] hover:border-[#C9A45C] hover:bg-[#173C30] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Concierge</span>
            </button>
            <a
              href="#reservations"
              onClick={onOpenReserve}
              className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 rounded-sm bg-[#C9A45C] text-[#101010] text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#DFC082] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              Reserve Table
            </a>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-sm border border-[#C9A45C]/35 text-[#F8F4EC] hover:border-[#C9A45C] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#101010] flex flex-col justify-between px-6 py-6 lg:hidden overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-2xl font-semibold text-[#F8F4EC]">Chop &apos;n Chill</span>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              className="inline-flex items-center justify-center w-11 h-11 rounded-sm border border-[#C9A45C]/35 text-[#F8F4EC]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex flex-col gap-4 my-8">
            <a
              href="#home"
              onClick={() => setMobileOpen(false)}
              className="font-display text-3xl text-[#F8F4EC] hover:text-[#C9A45C]"
            >
              Home
            </a>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="font-display text-3xl text-[#F8F4EC] hover:text-[#C9A45C]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex flex-col gap-3 pt-6 border-t border-[#F8F4EC]/10">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenConcierge();
              }}
              className="inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-sm bg-[#173C30] border border-[#C9A45C]/45 text-[#DFC082] text-xs font-semibold uppercase tracking-[0.14em] min-h-[46px]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Talk to AI Concierge</span>
            </button>
            <a
              href="#reservations"
              onClick={() => {
                setMobileOpen(false);
                onOpenReserve();
              }}
              className="inline-flex items-center justify-center py-3.5 px-6 rounded-sm bg-[#C9A45C] text-[#101010] text-xs font-semibold uppercase tracking-[0.14em] min-h-[46px]"
            >
              Reserve Your Table
            </a>
            <a
              href="tel:+233554903755"
              className="inline-flex items-center justify-center py-3.5 px-6 rounded-sm border border-[#C9A45C]/40 text-[#F8F4EC] text-xs font-semibold uppercase tracking-[0.14em] min-h-[46px]"
            >
              Call +233 55 490 3755
            </a>
          </div>
        </div>
      )}
    </>
  );
}
