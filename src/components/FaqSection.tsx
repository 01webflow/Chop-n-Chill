import { ChevronDown, MessageCircle, Phone, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FaqCategory, FaqItem, RestaurantSettings } from '../types';

interface FaqSectionProps {
  faqs: FaqItem[];
  settings: RestaurantSettings;
}

const FAQ_FILTERS: Array<'All' | FaqCategory> = [
  'All',
  'Reservations',
  'Menu & Dietary',
  'Location & Parking',
  'Lounge & Live Band',
];

export function FaqSection({ faqs, settings }: FaqSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<'All' | FaqCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);

  const visibleFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return faqs.filter((item) => {
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesQuery =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [faqs, selectedCategory, searchQuery]);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq" className="py-20 sm:py-28 bg-[#101010] border-t border-[#F8F4EC]/10">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Context Column */}
        <div className="lg:col-span-4 lg:sticky lg:top-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A45C] mb-3">
            Guest Information
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#F8F4EC] leading-[1.12] mb-4">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <p className="text-sm sm:text-base text-[#C8BFA8] leading-relaxed mb-7">
            Practical answers on parking, table reservation deposits, dietary preferences, and our Kasoa lounge spaces. Need immediate confirmation from our team?
          </p>

          <div className="flex flex-wrap gap-3">
            <a
              href={`tel:${settings.phone.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-sm bg-[#C9A45C] text-[#101010] text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#DFC082] transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
            >
              <Phone className="w-4 h-4" />
              <span>Call {settings.phone}</span>
            </a>
            <a
              href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
                "Hello Chop 'n Chill Kasoa, I have a question about visiting."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-sm border border-[#C9A45C]/45 text-xs font-semibold uppercase tracking-[0.14em] text-[#F8F4EC] hover:border-[#C9A45C] transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
            >
              <MessageCircle className="w-4 h-4 text-[#C9A45C]" />
              <span>Ask on WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Right Accordion Column */}
        <div className="lg:col-span-8">
          {/* Local Keyword Search & Category Filter */}
          <div className="space-y-4 mb-6">
            <div className="relative">
              <Search className="w-4 h-4 text-[#9A9282] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search FAQs (e.g., parking, deposit, allergies, terrace)..."
                aria-label="Search frequently asked questions"
                className="w-full pl-10 pr-10 py-3 rounded-sm bg-[#1C1C1C] border border-[#F8F4EC]/15 text-sm text-[#F8F4EC] placeholder:text-[#9A9282] focus:border-[#C9A45C] focus:outline-none min-h-[46px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear FAQ search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 inline-flex items-center justify-center rounded-sm text-[#9A9282] hover:text-[#F8F4EC]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                role="tablist"
                aria-label="Filter frequently asked questions by category"
                className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-sm bg-[#1C1C1C] border border-[#F8F4EC]/10"
              >
                {FAQ_FILTERS.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setSelectedCategory(cat);
                        const first =
                          cat === 'All' ? faqs[0]?.id : faqs.find((f) => f.category === cat)?.id;
                        setOpenId(first ?? null);
                      }}
                      className={`px-3.5 py-2 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 min-h-[38px] ${
                        active
                          ? 'bg-[#C9A45C] text-[#101010] font-semibold'
                          : 'text-[#C8BFA8] hover:text-[#F8F4EC]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <span className="text-xs text-[#9A9282] tabular-nums">
                {visibleFaqs.length} {visibleFaqs.length === 1 ? 'question' : 'questions'}
              </span>
            </div>
          </div>

          <div className="border-t border-[#F8F4EC]/12 divide-y divide-[#F8F4EC]/12">
            {visibleFaqs.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <p className="text-sm text-[#C8BFA8]">
                  No questions matched &ldquo;{searchQuery.trim() || selectedCategory}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setOpenId(faqs[0]?.id ?? null);
                  }}
                  className="px-4 py-2 rounded-sm border border-[#C9A45C]/45 text-xs font-semibold uppercase tracking-[0.12em] text-[#DFC082] hover:border-[#C9A45C] min-h-[40px]"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              visibleFaqs.map((item, idx) => {
                const isOpen = openId === item.id;
                const panelId = `faq-panel-${item.id}`;
                const buttonId = `faq-btn-${item.id}`;
                return (
                  <div key={item.id} className="py-1">
                    <h3>
                      <button
                        id={buttonId}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => toggleItem(item.id)}
                        className="w-full py-5 flex items-start justify-between gap-6 text-left group min-h-[56px]"
                      >
                        <div>
                          <p className="text-xs text-[#C9A45C] mb-1">
                            <span>{String(idx + 1).padStart(2, '0')}.</span>{' '}
                            <span>{item.category}</span>
                            {item.isPlaceholder && (
                              <>
                                <span aria-hidden="true"> · </span>
                                <span className="text-[#9A9282]">Policy Editable by Staff</span>
                              </>
                            )}
                          </p>
                          <span className="font-display text-lg sm:text-xl font-medium text-[#F8F4EC] group-hover:text-[#DFC082] transition-colors">
                            {item.question}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-[#C9A45C] shrink-0 mt-1 transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                    </h3>

                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      hidden={!isOpen}
                      className="pb-6 pr-8 text-sm sm:text-base text-[#C8BFA8] leading-relaxed"
                    >
                      {item.answer}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
