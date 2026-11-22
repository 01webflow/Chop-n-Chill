import { Phone, Plus, Search, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useMemo, useState } from 'react';
import { resolvePublicAssetUrl } from '../lib/assets';
import { MENU_CATEGORIES, MenuCategory, MenuItem } from '../types';

interface MenuSectionProps {
  menu: MenuItem[];
  phone: string;
  trayCount: number;
  onAddToTray: (item: MenuItem) => void;
  onOpenTray: () => void;
}

export function MenuSection({ menu, phone, trayCount, onAddToTray, onOpenTray }: MenuSectionProps) {
  const [activeCategory, setActiveCategory] = useState<'All' | MenuCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const shouldReduceMotion = useReducedMotion();

  const filteredMenu = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menu.filter((item) => {
      const catMatch = activeCategory === 'All' || item.category === activeCategory;
      const searchMatch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return catMatch && searchMatch;
    });
  }, [menu, activeCategory, searchQuery]);

  return (
    <section id="menu" className="py-20 sm:py-28 bg-[#101010]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Header Row */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#F8F4EC]/12"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A45C] mb-3">
              Our Menu
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#F8F4EC] mb-4">
              GHANAIAN CLASSICS &amp; LOUNGE GRILLS
            </h2>
            <p className="text-[#C8BFA8] max-w-2xl text-base">
              Highlighting guest favourites mentioned in Kasoa reviews. Where exact Ghana Cedi prices or ingredient lists have not yet been confirmed, editable placeholders are shown—management updates sync live.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenTray}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-sm border border-[#C9A45C]/45 bg-[#1C1C1C] text-[#F8F4EC] text-xs font-semibold uppercase tracking-[0.14em] hover:border-[#C9A45C] transition-colors whitespace-nowrap shrink-0 min-h-[46px]"
            >
              <ShoppingBag className="w-4 h-4 text-[#C9A45C]" />
              <span>Order Tray ({trayCount})</span>
            </button>
            <a
              href={`tel:${phone.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-[#C9A45C] text-[#101010] text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#DFC082] transition-colors whitespace-nowrap shrink-0 min-h-[46px]"
            >
              <Phone className="w-4 h-4" />
              <span>Call To Order</span>
            </a>
          </div>
        </motion.div>

        {/* Category Filter Tabs & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 my-8">
          <div
            role="tablist"
            aria-label="Menu Categories"
            className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-sm bg-[#1C1C1C] border border-[#F8F4EC]/10"
          >
            {(['All', ...MENU_CATEGORIES] as const).map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveCategory(cat)}
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

          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="w-4 h-4 text-[#9A9282] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes..."
              aria-label="Search menu dishes"
              className="w-full pl-10 pr-4 py-2.5 rounded-sm bg-[#1C1C1C] border border-[#F8F4EC]/15 text-sm text-[#F8F4EC] placeholder:text-[#9A9282] focus:border-[#C9A45C] focus:outline-none min-h-[44px]"
            />
          </div>
        </div>

        {/* Menu Grid */}
        {filteredMenu.length === 0 ? (
          <div className="py-16 text-center border border-[#F8F4EC]/10 rounded-sm bg-[#1C1C1C]">
            <p className="text-[#C8BFA8] mb-3">No dishes match your current filter or search.</p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('All');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] border border-[#C9A45C]/40 text-[#DFC082] rounded-sm hover:border-[#C9A45C]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMenu.map((item, idx) => (
              <motion.article
                key={item.id}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, delay: Math.min(idx * 0.05, 0.25) }}
                className="group flex flex-col bg-gradient-to-b from-[#1C1C1C] to-[#161616] border border-[#F8F4EC]/10 hover:border-[#C9A45C]/55 hover:-translate-y-1 rounded-sm overflow-hidden transition-all duration-300 shadow-lg hover:shadow-2xl"
              >
                <div className="relative aspect-[4/3] bg-[#141414] overflow-hidden">
                  {item.image ? (
                    <>
                      <img
                        src={resolvePublicAssetUrl(item.image)}
                        alt={
                          item.category === 'Drinks & Beverages'
                            ? `${item.name} — Three tall iced citrus and mint lounge beverages at Chop 'n Chill Kasoa`
                            : `${item.name} at Chop 'n Chill Restaurant & Lounge, Kasoa`
                        }
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.05]"
                      />
                      {!item.imageVerified && (
                        <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-sm bg-[#101010]/85 border border-[#C9A45C]/35 text-[10px] font-medium uppercase tracking-[0.12em] text-[#DFC082]">
                          Archive Photo · Confirm Rights
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#1C1C1C] via-[#151A18] to-[#173C30]/35 border-b border-[#F8F4EC]/5">
                      <div className="w-12 h-12 rounded-full border border-[#C9A45C]/30 bg-[#101010]/70 flex items-center justify-center mb-3">
                        <UtensilsCrossed className="w-5 h-5 text-[#C9A45C]" />
                      </div>
                      <span className="font-display text-lg text-[#F8F4EC]">{item.name}</span>
                      <span className="text-[11px] uppercase tracking-[0.12em] text-[#C9A45C] mt-1.5">
                        {item.isFavourite ? 'Customer Favourite · Photo Pending' : 'Kitchen Photo Pending'}
                      </span>
                      <span className="text-xs text-[#9A9282] mt-1 max-w-[230px]">
                        Upload verified kitchen photography in the Owner Portal
                      </span>
                    </div>
                  )}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(to top, rgba(16,16,16,0.68) 0%, transparent 48%)',
                    }}
                  />
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <p className="text-xs text-[#C9A45C] mb-1.5">
                      <span>{item.category}</span>
                      {item.isFavourite && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>Customer Favourite</span>
                        </>
                      )}
                    </p>
                    <h3 className="font-display text-xl font-semibold text-[#F8F4EC] mb-2">
                      {item.name}
                    </h3>
                    <p className="text-sm text-[#B8B0A0] leading-relaxed">{item.description}</p>
                  </div>

                  <div className="pt-4 border-t border-[#F8F4EC]/10 flex items-center justify-between gap-3">
                    <span className="font-mono text-sm font-medium text-[#DFC082] tabular-nums">
                      {item.priceCedi !== null ? `GH₵ ${item.priceCedi.toFixed(2)}` : `GH₵ · ${item.priceLabel}`}
                    </span>

                    {item.available ? (
                      <button
                        type="button"
                        onClick={() => onAddToTray(item)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm border border-[#C9A45C]/45 text-xs font-semibold uppercase tracking-[0.1em] text-[#F8F4EC] hover:bg-[#C9A45C] hover:text-[#101010] transition-colors whitespace-nowrap shrink-0 min-h-[38px]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Order</span>
                      </button>
                    ) : (
                      <span className="text-xs text-[#9A9282]">Currently Unavailable</span>
                    )}
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
