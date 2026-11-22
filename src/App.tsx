import { useCallback, useEffect, useState } from 'react';
import { AboutSection } from './components/AboutSection';
import { AdminDashboard } from './components/AdminDashboard';
import { AiConcierge } from './components/AiConcierge';
import { ContactSection } from './components/ContactSection';
import { EntertainmentSection } from './components/EntertainmentSection';
import { FaqSection } from './components/FaqSection';
import { FloatingConcierge } from './components/FloatingConcierge';
import { Footer } from './components/Footer';
import { GallerySection } from './components/GallerySection';
import { HeroSection } from './components/HeroSection';
import { MenuSection } from './components/MenuSection';
import { Navbar } from './components/Navbar';
import { OrderDrawer, TrayItem } from './components/OrderDrawer';
import { ReservationsSection } from './components/ReservationsSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { MenuItem, PublicStorePayload } from './types';

const HERO_IMAGE = '/src/assets/images/hero_chop_chill_exterior_1795211571468.jpg';
const ABOUT_IMAGE = '/src/assets/images/about_terrace_dining_1795211571923.jpg';
const LIVE_IMAGE = '/src/assets/images/live_band_lounge_1795211571900.jpg';

const INITIAL_FALLBACK_DATA: PublicStorePayload = {
  settings: {
    businessName: "Chop 'n Chill Restaurant & Lounge",
    address: 'HH3J+G5M, Kasoa, Ghana',
    phone: '+233 55 490 3755',
    whatsappNumber: '233554903755',
    googleMapsUrl: 'https://maps.app.goo.gl/kUKzbf8rbvxfX9BK6',
    openingHours:
      'Schedule editable in Owner Portal — please call +233 55 490 3755 to confirm daily hours.',
    deliveryNote:
      'Dine-in, takeaway, and delivery available. Delivery coverage confirmed by staff upon enquiry.',
    socials: [],
  },
  aiPublicConfig: {
    receptionistName: 'AI Concierge',
    voiceEnabled: true,
  },
  menu: [],
  events: [],
  gallery: [],
  faqs: [
    {
      id: 'faq-parking',
      category: 'Location & Parking',
      question: "Is parking available at Chop 'n Chill in Kasoa?",
      answer:
        'Please call +233 55 490 3755 or message us on WhatsApp prior to your visit to confirm current parking access near HH3J+G5M, Kasoa—especially during weekend live-band evenings.',
      isPlaceholder: true,
    },
    {
      id: 'faq-deposits',
      category: 'Reservations',
      question: 'Do you require a deposit for table reservations or group bookings?',
      answer:
        'Online reservation requests do not charge any payment upfront and are only confirmed once Chop \'n Chill staff respond. Any group deposit policy is confirmed directly by our team.',
      isPlaceholder: true,
    },
    {
      id: 'faq-dietary',
      category: 'Menu & Dietary',
      question: 'Can you accommodate dietary preferences or food allergies?',
      answer:
        'Please note allergies or spice preferences in Special Requests and confirm specific dish ingredients directly with our kitchen team at +233 55 490 3755 before ordering.',
      isPlaceholder: true,
    },
  ],
  tableSummary: {
    total: 5,
    available: 5,
    areas: ['Indoor Dining', 'Outdoor Dining', 'Upstairs Terrace'],
  },
};

export default function App() {
  const [data, setData] = useState<PublicStorePayload>(INITIAL_FALLBACK_DATA);
  const [tray, setTray] = useState<TrayItem[]>([]);
  const [trayOpen, setTrayOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [conciergeOpenSignal, setConciergeOpenSignal] = useState(0);

  const loadPublicStore = useCallback(async () => {
    try {
      const resp = await fetch('/api/public');
      if (!resp.ok) return;
      const payload = (await resp.json()) as PublicStorePayload;
      setData(payload);
    } catch {
      // Keep fallback data if offline
    }
  }, []);

  useEffect(() => {
    loadPublicStore();
  }, [loadPublicStore]);

  const handleAddToTray = (item: MenuItem) => {
    setTray((prev) => {
      const existing = prev.find((t) => t.item.id === item.id);
      if (existing) {
        return prev.map((t) => (t.item.id === item.id ? { ...t, qty: t.qty + 1 } : t));
      }
      return [...prev, { item, qty: 1 }];
    });
    setTrayOpen(true);
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setTray((prev) =>
      prev
        .map((t) => (t.item.id === id ? { ...t, qty: t.qty + delta } : t))
        .filter((t) => t.qty > 0)
    );
  };

  const totalTrayCount = tray.reduce((sum, t) => sum + t.qty, 0);

  return (
    <div className="min-h-screen bg-[#101010] text-[#F8F4EC] flex flex-col">
      <Navbar
        onOpenReserve={() => {}}
        onOpenConcierge={() => setConciergeOpenSignal((n) => n + 1)}
      />

      <main className="flex-1">
        <HeroSection
          settings={data.settings}
          heroImage={HERO_IMAGE}
          onOpenConcierge={() => setConciergeOpenSignal((n) => n + 1)}
        />

        <AboutSection aboutImage={ABOUT_IMAGE} />

        <MenuSection
          menu={data.menu}
          phone={data.settings.phone}
          trayCount={totalTrayCount}
          onAddToTray={handleAddToTray}
          onOpenTray={() => setTrayOpen(true)}
        />

        <EntertainmentSection events={data.events} liveImage={LIVE_IMAGE} />

        <GallerySection gallery={data.gallery} />

        <TestimonialsSection googleMapsUrl={data.settings.googleMapsUrl} />

        <ReservationsSection settings={data.settings} />

        <FaqSection faqs={data.faqs} settings={data.settings} />

        <ContactSection settings={data.settings} />
      </main>

      <Footer settings={data.settings} onOpenAdmin={() => setAdminOpen(true)} />

      <AiConcierge
        settings={data.settings}
        aiPublicConfig={data.aiPublicConfig}
        externalOpenSignal={conciergeOpenSignal}
      />

      <FloatingConcierge settings={data.settings} />

      <OrderDrawer
        open={trayOpen}
        tray={tray}
        settings={data.settings}
        onClose={() => setTrayOpen(false)}
        onUpdateQty={handleUpdateQty}
        onClearTray={() => setTray([])}
      />

      <AdminDashboard
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        onPublicDataChanged={loadPublicStore}
      />
    </div>
  );
}
