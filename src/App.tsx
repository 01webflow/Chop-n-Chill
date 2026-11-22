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
import { DEFAULT_PUBLIC_STORE } from './data/defaultPublicStore';
import { resolvePublicAssetUrl } from './lib/assets';
import { MenuItem, PublicStorePayload } from './types';

const HERO_IMAGE = resolvePublicAssetUrl('/images/restaurant/chop-n-chill-exterior-night-lights.jpg');
const ABOUT_IMAGE = resolvePublicAssetUrl('/images/restaurant/chop-n-chill-exterior-day-terrace.jpg');
const LIVE_IMAGE = resolvePublicAssetUrl('/images/restaurant/chop-n-chill-live-band-performance.jpg');

export default function App() {
  const [data, setData] = useState<PublicStorePayload>(DEFAULT_PUBLIC_STORE);
  const [tray, setTray] = useState<TrayItem[]>([]);
  const [trayOpen, setTrayOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [conciergeOpenSignal, setConciergeOpenSignal] = useState(0);

  const loadPublicStore = useCallback(async () => {
    try {
      const resp = await fetch('api/public');
      if (!resp.ok) return;
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const payload = (await resp.json()) as PublicStorePayload;
      if (payload && Array.isArray(payload.menu) && Array.isArray(payload.gallery)) {
        setData(payload);
      }
    } catch {
      // Keep complete static fallback data when hosted without backend (e.g. GitHub Pages)
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

        <AboutSection aboutImage={ABOUT_IMAGE} gallery={data.gallery} />

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
