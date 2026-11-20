import { ArrowUp, MessageCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RestaurantSettings } from '../types';

interface FloatingConciergeProps {
  settings: RestaurantSettings;
}

const PRESET_MESSAGES = [
  {
    label: 'Table Reservations',
    text: "Hello Chop 'n Chill Kasoa, I would like to enquire about reserving a table.",
  },
  {
    label: 'Menu Enquiries',
    text: "Hello Chop 'n Chill Kasoa, I would like to ask about today's menu and prices.",
  },
  {
    label: 'Takeaway & Delivery',
    text: "Hello Chop 'n Chill Kasoa, I would like to place a takeaway or delivery enquiry.",
  },
  {
    label: 'General Questions',
    text: "Hello Chop 'n Chill Kasoa, I have a general question before visiting.",
  },
];

export function FloatingConcierge({ settings }: FloatingConciergeProps) {
  const [showTop, setShowTop] = useState(false);
  const [waOpen, setWaOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 480);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2.5">
        {showTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Back to top"
            className="w-11 h-11 rounded-sm bg-[#1C1C1C]/95 border border-[#C9A45C]/45 text-[#DFC082] inline-flex items-center justify-center hover:bg-[#C9A45C] hover:text-[#101010] transition-colors shadow-lg"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setWaOpen(true)}
          aria-label="Contact Chop 'n Chill on WhatsApp"
          className="inline-flex items-center gap-2 px-4 py-3 rounded-sm bg-[#173C30] border border-[#C9A45C]/50 text-[#F8F4EC] text-xs font-semibold uppercase tracking-[0.12em] hover:bg-[#1E4D3E] shadow-xl min-h-[44px]"
        >
          <MessageCircle className="w-4 h-4 text-[#DFC082]" />
          <span>WhatsApp</span>
        </button>
      </div>

      {waOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="WhatsApp Enquiry Topics"
          onClick={() => setWaOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#161616] border border-[#C9A45C]/35 rounded-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#F8F4EC]/10">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[#C9A45C]">
                  WhatsApp Concierge
                </p>
                <h3 className="font-display text-xl text-[#F8F4EC] mt-0.5">
                  Message Chop 'n Chill
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWaOpen(false)}
                aria-label="Close WhatsApp options"
                className="w-9 h-9 inline-flex items-center justify-center rounded-sm border border-[#F8F4EC]/15 text-[#F8F4EC]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-[#C8BFA8] my-4">
              Select a topic below to start a prefilled chat with {settings.phone}:
            </p>

            <div className="space-y-2.5">
              {PRESET_MESSAGES.map((item) => (
                <a
                  key={item.label}
                  href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
                    item.text
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setWaOpen(false)}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-sm bg-[#1C1C1C] border border-[#F8F4EC]/12 hover:border-[#C9A45C] text-sm font-medium text-[#F8F4EC] transition-colors min-h-[46px]"
                >
                  <span>{item.label}</span>
                  <MessageCircle className="w-4 h-4 text-[#C9A45C]" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
