import { CheckCircle2, Minus, Phone, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { MenuItem, OrderServiceType, RestaurantSettings } from '../types';

export interface TrayItem {
  item: MenuItem;
  qty: number;
}

interface OrderDrawerProps {
  open: boolean;
  tray: TrayItem[];
  settings: RestaurantSettings;
  onClose: () => void;
  onUpdateQty: (id: string, delta: number) => void;
  onClearTray: () => void;
}

export function OrderDrawer({
  open,
  tray,
  settings,
  onClose,
  onUpdateQty,
  onClearTray,
}: OrderDrawerProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [serviceType, setServiceType] = useState<OrderServiceType>('Takeaway');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<{ id: string; whatsappUrl: string } | null>(
    null
  );
  const [error, setError] = useState('');

  if (!open) return null;

  const allPriced = tray.length > 0 && tray.every((t) => typeof t.item.priceCedi === 'number');
  const estimatedTotal = allPriced
    ? tray.reduce((sum, t) => sum + (t.item.priceCedi || 0) * t.qty, 0)
    : null;

  const buildWhatsAppLink = (orderId?: string) => {
    const lines = tray.map(
      (t) =>
        `- ${t.qty}x ${t.item.name}${
          t.item.priceCedi !== null ? ` (GH₵ ${(t.item.priceCedi * t.qty).toFixed(2)})` : ''
        }`
    );
    const body = [
      `Order Enquiry (${serviceType}) — Chop 'n Chill Kasoa`,
      orderId ? `Reference: ${orderId}` : '',
      customerName.trim() ? `Name: ${customerName.trim()}` : '',
      customerPhone.trim() ? `Phone: ${customerPhone.trim()}` : '',
      '',
      ...lines,
      estimatedTotal !== null ? `\nEstimated Subtotal: GH₵ ${estimatedTotal.toFixed(2)}` : '',
      notes.trim() ? `\nNotes: ${notes.trim()}` : '',
    ]
      .filter((x) => x !== undefined && x !== '')
      .join('\n');

    return `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(body)}`;
  };

  const handleSubmitEnquiry = async () => {
    if (!tray.length) return;
    setError('');
    setSubmitting(true);
    try {
      const resp = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim() || 'Guest Enquiry',
          customerPhone: customerPhone.trim(),
          serviceType,
          notes: notes.trim(),
          items: tray.map((t) => ({ menuItemId: t.item.id, qty: t.qty })),
        }),
      });
      const data = (await resp.json()) as { order?: { id: string }; error?: string };
      if (!resp.ok || !data.order) {
        setError(data.error || 'Unable to log order online. Use WhatsApp or Call below.');
        return;
      }
      setSubmittedOrder({
        id: data.order.id,
        whatsappUrl: buildWhatsAppLink(data.order.id),
      });
    } catch {
      setError('Connection error. Send directly via WhatsApp or call +233 55 490 3755.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Order Enquiry Tray"
      onClick={onClose}
    >
      <aside
        className="w-full max-w-md bg-[#161616] border-l border-[#C9A45C]/30 h-full flex flex-col justify-between p-6 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[#F8F4EC]/12">
            <div>
              <h3 className="font-display text-2xl text-[#F8F4EC]">Order Enquiry Tray</h3>
              <p className="text-xs text-[#9A9282]">Dine-in · Takeaway · Delivery enquiry</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close order tray"
              className="w-10 h-10 inline-flex items-center justify-center rounded-sm border border-[#F8F4EC]/15 text-[#F8F4EC] hover:border-[#C9A45C]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {submittedOrder ? (
            <div className="mt-6 space-y-4 p-5 rounded-sm bg-[#101010] border border-[#C9A45C]/30">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#C9A45C] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-mono text-[#C9A45C]">Ref {submittedOrder.id}</p>
                  <h4 className="font-display text-xl text-[#F8F4EC] mt-0.5">
                    Enquiry Logged — Staff Confirmation Needed
                  </h4>
                </div>
              </div>
              <p className="text-sm text-[#C8BFA8] leading-relaxed">
                No payment has been charged. Forward this order enquiry to our team via WhatsApp or call us to confirm availability, total pricing, and pickup or delivery timing.
              </p>
              <a
                href={submittedOrder.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center py-3 px-4 rounded-sm bg-[#C9A45C] text-[#101010] text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#DFC082] min-h-[46px]"
              >
                Send Order on WhatsApp
              </a>
              <button
                type="button"
                onClick={() => {
                  setSubmittedOrder(null);
                  onClearTray();
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-sm border border-[#F8F4EC]/20 text-xs uppercase tracking-[0.12em] text-[#C8BFA8] hover:text-[#F8F4EC]"
              >
                Done &amp; Clear Tray
              </button>
            </div>
          ) : tray.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <p className="text-sm text-[#C8BFA8]">
                Your order tray is currently empty. Add dishes from Our Menu to request takeaway, delivery, or dine-in availability.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {tray.map(({ item, qty }) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-sm bg-[#1C1C1C] border border-[#F8F4EC]/10"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-[#F8F4EC] truncate">{item.name}</p>
                    <p className="font-mono text-xs text-[#DFC082] tabular-nums mt-0.5">
                      {item.priceCedi !== null
                        ? `GH₵ ${(item.priceCedi * qty).toFixed(2)}`
                        : 'Price TBD (Confirm with staff)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.id, -1)}
                      aria-label={`Decrease ${item.name} quantity`}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-sm border border-[#F8F4EC]/20 text-[#F8F4EC] hover:border-[#C9A45C]"
                    >
                      {qty === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    </button>
                    <span className="font-mono text-sm w-5 text-center tabular-nums">{qty}</span>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.id, 1)}
                      aria-label={`Increase ${item.name} quantity`}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-sm border border-[#F8F4EC]/20 text-[#F8F4EC] hover:border-[#C9A45C]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-[#F8F4EC]/10 space-y-3">
                <div>
                  <label className="block text-xs text-[#C8BFA8] mb-1.5">Service Type</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['Takeaway', 'Delivery', 'Dine-In'] as OrderServiceType[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setServiceType(st)}
                        className={`py-2 text-xs font-medium rounded-sm border transition-colors ${
                          serviceType === st
                            ? 'bg-[#C9A45C] text-[#101010] border-[#C9A45C] font-semibold'
                            : 'bg-[#1C1C1C] text-[#C8BFA8] border-[#F8F4EC]/15'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Your Name"
                    aria-label="Customer name"
                    className="px-3 py-2 rounded-sm bg-[#1C1C1C] border border-[#F8F4EC]/15 text-sm text-[#F8F4EC] focus:border-[#C9A45C] focus:outline-none min-h-[42px]"
                  />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone (+233...)"
                    aria-label="Customer phone"
                    className="px-3 py-2 rounded-sm bg-[#1C1C1C] border border-[#F8F4EC]/15 text-sm text-[#F8F4EC] focus:border-[#C9A45C] focus:outline-none min-h-[42px]"
                  />
                </div>

                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Spice preference, delivery area in Kasoa, or pickup time..."
                  aria-label="Order notes"
                  className="w-full px-3 py-2 rounded-sm bg-[#1C1C1C] border border-[#F8F4EC]/15 text-sm text-[#F8F4EC] focus:border-[#C9A45C] focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {tray.length > 0 && !submittedOrder && (
          <div className="pt-5 mt-5 border-t border-[#F8F4EC]/12 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#C8BFA8]">Estimated Total</span>
              <span className="font-mono font-semibold text-[#DFC082] tabular-nums">
                {estimatedTotal !== null ? `GH₵ ${estimatedTotal.toFixed(2)}` : 'Confirmed by staff'}
              </span>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitEnquiry}
              className="w-full py-3.5 px-5 rounded-sm bg-[#C9A45C] text-[#101010] text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#DFC082] disabled:opacity-60 min-h-[46px]"
            >
              {submitting ? 'Preparing Order...' : 'Submit & Open WhatsApp'}
            </button>
            <a
              href={`tel:${settings.phone.replace(/\s+/g, '')}`}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-sm border border-[#F8F4EC]/20 text-xs font-semibold uppercase tracking-[0.14em] text-[#F8F4EC] hover:border-[#C9A45C] min-h-[44px]"
            >
              <Phone className="w-4 h-4 text-[#C9A45C]" />
              <span>Call {settings.phone}</span>
            </a>
          </div>
        )}
      </aside>
    </div>
  );
}
