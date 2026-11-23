import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
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
import { PageLoadingSkeleton } from './components/PageLoadingSkeleton';
import { ReservationsSection } from './components/ReservationsSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { DEFAULT_PUBLIC_STORE } from './data/defaultPublicStore';
import { resolvePublicAssetUrl } from './lib/assets';
import { isStaticGitHubPagesHost } from './lib/runtime';
import { MenuItem, PublicStorePayload } from './types';

const HERO_IMAGE = resolvePublicAssetUrl('/images/restaurant/chop-n-chill-exterior-night-lights.jpg');
const ABOUT_IMAGE = resolvePublicAssetUrl('/images/restaurant/chop-n-chill-exterior-day-terrace.jpg');
const LIVE_IMAGE = resolvePublicAssetUrl('/images/restaurant/chop-n-chill-live-band-performance.jpg');

function ScrollToRouteTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

export default function App() {
  const [data, setData] = useState<PublicStorePayload>(DEFAULT_PUBLIC_STORE);
  const [isLoadingStore, setIsLoadingStore] = useState<boolean>(() => !isStaticGitHubPagesHost());
  const [tray, setTray] = useState<TrayItem[]>([]);
  const [trayOpen, setTrayOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [conciergeOpenSignal, setConciergeOpenSignal] = useState(0);

  const loadPublicStore = useCallback(async () => {
    if (isStaticGitHubPagesHost()) {
      setIsLoadingStore(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 4000);
    try {
      const resp = await fetch('api/public', { signal: controller.signal });
      if (!resp.ok) return;
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const payload = (await resp.json()) as PublicStorePayload;
      if (payload && Array.isArray(payload.menu) && Array.isArray(payload.gallery)) {
        setData(payload);
      }
    } catch {
      // Keep complete static fallback data if backend is slow or unavailable
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoadingStore(false);
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

  const openConcierge = () => setConciergeOpenSignal((n) => n + 1);

  return (
    <div className="min-h-screen bg-[#101010] text-[#F8F4EC] flex flex-col">
      <ScrollToRouteTop />
      <Navbar onOpenReserve={() => {}} onOpenConcierge={openConcierge} />

      <main className="flex-1">
        {isLoadingStore ? (
          <PageLoadingSkeleton />
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <HeroSection
                    settings={data.settings}
                    heroImage={HERO_IMAGE}
                    onOpenConcierge={openConcierge}
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
                </>
              }
            />
            <Route
              path="/about"
              element={
                <div className="pt-20 sm:pt-24">
                  <AboutSection aboutImage={ABOUT_IMAGE} gallery={data.gallery} />
                  <TestimonialsSection googleMapsUrl={data.settings.googleMapsUrl} />
                </div>
              }
            />
            <Route
              path="/menu"
              element={
                <div className="pt-20 sm:pt-24">
                  <MenuSection
                    menu={data.menu}
                    phone={data.settings.phone}
                    trayCount={totalTrayCount}
                    onAddToTray={handleAddToTray}
                    onOpenTray={() => setTrayOpen(true)}
                  />
                </div>
              }
            />
            <Route
              path="/gallery"
              element={
                <div className="pt-20 sm:pt-24">
                  <GallerySection gallery={data.gallery} />
                </div>
              }
            />
            <Route
              path="/live-band"
              element={
                <div className="pt-20 sm:pt-24">
                  <EntertainmentSection events={data.events} liveImage={LIVE_IMAGE} />
                </div>
              }
            />
            <Route path="/entertainment" element={<Navigate to="/live-band" replace />} />
            <Route
              path="/reservations"
              element={
                <div className="pt-20 sm:pt-24">
                  <ReservationsSection settings={data.settings} />
                </div>
              }
            />
            <Route
              path="/faq"
              element={
                <div className="pt-20 sm:pt-24">
                  <FaqSection faqs={data.faqs} settings={data.settings} />
                </div>
              }
            />
            <Route
              path="/contact"
              element={
                <div className="pt-20 sm:pt-24">
                  <ContactSection settings={data.settings} />
                </div>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
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
