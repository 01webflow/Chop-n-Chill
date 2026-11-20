import { CheckCircle2, Phone } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { ReservationRequest, RestaurantSettings, TableArea } from '../types';

interface ReservationsSectionProps {
  settings: RestaurantSettings;
}

export function ReservationsSection({ settings }: ReservationsSectionProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [guests, setGuests] = useState(2);
  const [seatingPreference, setSeatingPreference] = useState<TableArea | 'No Preference'>('No Preference');
  const [specialRequests, setSpecialRequests] = useState('');
  const [websiteHoneypot, setWebsiteHoneypot] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [confirmedRequest, setConfirmedRequest] = useState<{
    id: string;
    whatsappUrl: string;
  } | null>(null);

  const validate = () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Please enter your full name.';
    if (!/^[+0-9\s()-]{7,24}$/.test(phone.trim())) next.phone = 'Enter a valid telephone number.';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Please enter a valid email address.';
    }
    if (!date) next.date = 'Select a preferred date.';
    if (!time) next.time = 'Select a preferred time.';
    if (!Number.isInteger(guests) || guests < 1 || guests > 50) {
      next.guests = 'Enter between 1 and 50 guests.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildWhatsAppUrl = (resId?: string) => {
    const msg = [
      `Reservation Request — Chop 'n Chill Restaurant & Lounge, Kasoa`,
      resId ? `Reference: ${resId}` : '',
      `Name: ${name.trim()}`,
      `Phone: ${phone.trim()}`,
      email.trim() ? `Email: ${email.trim()}` : '',
      `Date: ${date}`,
      `Time: ${time}`,
      `Guests: ${guests}`,
      `Seating: ${seatingPreference}`,
      specialRequests.trim() ? `Requests: ${specialRequests.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    return `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(msg)}`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const resp = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          date,
          time,
          guests,
          seatingPreference,
          specialRequests: specialRequests.trim(),
          website: websiteHoneypot,
        }),
      });
      const data = (await resp.json()) as {
        reservation?: Pick<ReservationRequest, 'id'>;
        error?: string;
      };
      if (!resp.ok || !data.reservation) {
        setServerError(data.error || 'Could not submit online. Use WhatsApp or Call below.');
        return;
      }
      setConfirmedRequest({
        id: data.reservation.id,
        whatsappUrl: buildWhatsAppUrl(data.reservation.id),
      });
    } catch {
      setServerError('Network issue while saving request. Please send via WhatsApp or call us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="reservations" className="py-20 sm:py-28 bg-[#1C1C1C] border-t border-[#F8F4EC]/10">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A45C] mb-3">
            Table Reservations
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#F8F4EC] leading-[1.1] mb-5">
            RESERVE YOUR TABLE
          </h2>
          <p className="text-[#C8BFA8] text-base leading-relaxed mb-8">
            Planning a romantic evening, family dinner, or weekend live-band hangout on our upstairs terrace? Submit your preferred date and party size below.
          </p>

          <div className="p-5 rounded-sm bg-[#101010] border border-[#C9A45C]/30 mb-8">
            <h3 className="font-sans text-sm font-semibold text-[#DFC082] mb-2">
              Staff Confirmation Policy
            </h3>
            <p className="text-sm text-[#C8BFA8] leading-relaxed">
              Submitting a request logs your booking details for our host team and prepares a WhatsApp message. Your table is <strong>only confirmed once Chop 'n Chill staff respond</strong> to confirm availability.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={`tel:${settings.phone.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-sm border border-[#C9A45C]/45 text-xs font-semibold uppercase tracking-[0.14em] text-[#F8F4EC] hover:border-[#C9A45C] min-h-[46px]"
            >
              <Phone className="w-4 h-4 text-[#C9A45C]" />
              <span>Call {settings.phone}</span>
            </a>
            <a
              href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
                "Hello Chop 'n Chill Kasoa, I would like to request a table reservation."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-5 py-3 rounded-sm bg-[#173C30] border border-[#C9A45C]/30 text-xs font-semibold uppercase tracking-[0.14em] text-[#F8F4EC] hover:bg-[#1E4D3E] min-h-[46px]"
            >
              WhatsApp Booking
            </a>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="p-6 sm:p-8 rounded-sm bg-[#101010] border border-[#C9A45C]/25">
            {confirmedRequest ? (
              <div className="py-4 space-y-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#C9A45C] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-mono text-[#C9A45C] uppercase tracking-wider">
                      Request Logged · Ref {confirmedRequest.id}
                    </p>
                    <h3 className="font-display text-2xl text-[#F8F4EC] mt-1">
                      Reservation Request Received — Pending Staff Confirmation
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-[#C8BFA8] leading-relaxed">
                  Thank you, {name}. Your request for {guests} guest(s) on {date} at {time} has been saved for our team. Remember: your booking is <strong>only confirmed after restaurant staff respond</strong>. For immediate confirmation, forward your request on WhatsApp or call us.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <a
                    href={confirmedRequest.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-sm bg-[#C9A45C] text-[#101010] text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#DFC082] min-h-[46px]"
                  >
                    Forward Request on WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => setConfirmedRequest(null)}
                    className="inline-flex items-center justify-center px-5 py-3 rounded-sm border border-[#F8F4EC]/25 text-xs font-semibold uppercase tracking-[0.14em] text-[#F8F4EC] hover:border-[#C9A45C] min-h-[46px]"
                  >
                    Submit Another Request
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {/* Spam honeypot */}
                <input
                  type="text"
                  name="website"
                  value={websiteHoneypot}
                  onChange={(e) => setWebsiteHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden="true"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="res-name" className="block text-xs font-medium text-[#C8BFA8] mb-1.5">
                      Customer Name *
                    </label>
                    <input
                      id="res-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      required
                      className="w-full px-3.5 py-2.5 rounded-sm bg-[#1C1C1C] border border-[#F8F4EC]/15 text-sm text-[#F8F4EC] focus:border-[#C9A45C] focus:outline-none min-h-[44px]"
                    />
                    {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="res-phone" className="block text-xs font-medium text-[#C8BFA8] mb-1.5">
                      Phone Number *
                    </label>
                    <input
                      id="res-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+233 ..."
                      required
                      className="w-full px-3.5 py-2.5 rounded-sm bg-[#1C1C1C] border border-[#F8F4EC]/15 text-sm text-[#F8F4EC] focus:border-[#C9A45C] focus:outline-none min-h-[44px]"
                    />
                    {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label htmlFor="res-email" className="block text-xs font-medium text-[#C8BFA8] mb-1.5">
                      Email Address (Optional)
                    </label>
                    <input
                      id="res-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2.5 rounded-sm bg-[#1C1C1C] border border-[#F8F4EC]/15 text-sm text-[#F8F4EC] focus:border-[#C9A45C] focus:outline-none min-h-[44px]"
                    />
                    {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="res-guests" className="block text-xs font-medium text-[#C8BFA8] mb-1.5">
                      Number of Guests *
                    </label>
                    <input
                      id="res-guests"
                      type="number"
                      min={1}
                      max={50}
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      required
                      className="w-full px-3.5 py-2.5 rounded-sm bg-[#1C1C1C] border border-[#F8F4EC]/15 text-sm text-[#F8F4EC] tabular-nums focus:border-[#C9A45C] focus:outline-none min-h-[44px]"
                    />
                    {errors.guests && <p className="text-xs text-red-400 mt-1">{errors.guests}</p>}
                  </div>

                  <div>
                    <label htmlFor="res-date" className="block text-xs font-medium text-[#C8BFA8] mb-1.5">
                      Preferred Date *
                    </label>
                    <input
                      id="res-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-sm bg-[#1C1C1C] border border-[#F8F4EC]/15 text-sm text-[#F8F4EC] focus:border-[#C9A45C] focus:outline-none min-h-[44px]"
                    />
                    {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
                  </div>

                  <div>
                    <label htmlFor="res-time" className="block text-xs font-medium text-[#C8BFA8] mb-1.5">
                      Preferred Time *
                    </label>
                    <input
                      id="res-time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-sm bg-[#1C1C1C] border border-[#F8F4EC]/15 text-sm text-[#F8F4EC] focus:border-[#C9A45C] focus:outline-none min-h-[44px]"
                    />
                    {errors.time && <p className="text-xs text-red-400 mt-1">{errors.time}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="res-seating" className="block text-xs font-medium text-[#C8BFA8] mb-1.5">
                    Seating Area Preference
                  </label>
                  <select
                    id="res-seating"
                    value={seatingPreference}
                    onChange={(e) =>
                      setSeatingPreference(e.target.value as TableArea | 'No Preference')
                    }
                    className="w-full px-3.5 py-2.5 rounded-sm bg-[#1C1C1C] border border-[#F8F4EC]/15 text-sm text-[#F8F4EC] focus:border-[#C9A45C] focus:outline-none min-h-[44px]"
                  >
                    <option value="No Preference">No Preference</option>
                    <option value="Indoor Dining">Indoor Dining</option>
                    <option value="Outdoor Dining">Outdoor Dining</option>
                    <option value="Upstairs Terrace">Upstairs Terrace</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="res-notes" className="block text-xs font-medium text-[#C8BFA8] mb-1.5">
                    Special Requests (Optional)
                  </label>
                  <textarea
                    id="res-notes"
                    rows={3}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Celebration notes, group seating, live-band viewing..."
                    className="w-full px-3.5 py-2.5 rounded-sm bg-[#1C1C1C] border border-[#F8F4EC]/15 text-sm text-[#F8F4EC] focus:border-[#C9A45C] focus:outline-none"
                  />
                </div>

                {serverError && (
                  <p className="text-sm text-red-400 bg-red-950/30 border border-red-800/40 px-4 py-2.5 rounded-sm">
                    {serverError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-6 rounded-sm bg-[#C9A45C] text-[#101010] text-xs font-semibold uppercase tracking-[0.15em] hover:bg-[#DFC082] disabled:opacity-60 transition-colors min-h-[48px]"
                >
                  {submitting ? 'Sending Request...' : 'Request A Reservation'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
