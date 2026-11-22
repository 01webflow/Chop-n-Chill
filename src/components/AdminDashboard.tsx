import {
  Bot,
  CalendarCheck,
  ChefHat,
  ClipboardList,
  CreditCard,
  Image as ImageIcon,
  LayoutGrid,
  List,
  LogOut,
  MessageSquareText,
  Plus,
  Search,
  Settings,
  Shield,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AdminStorePayload,
  AuthStatus,
  FaqCategory,
  GalleryCategory,
  MENU_CATEGORIES,
  MenuCategory,
  OrderServiceType,
  OrderStatus,
  ReservationStatus,
  TableArea,
  TableStatus,
} from '../types';

interface AdminDashboardProps {
  open: boolean;
  onClose: () => void;
  onPublicDataChanged: () => void;
}

type AdminTab =
  | 'overview'
  | 'orders'
  | 'pos'
  | 'kds'
  | 'tables'
  | 'menu'
  | 'events'
  | 'reservations'
  | 'inbox'
  | 'ai'
  | 'settings';

const ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Preparing',
  'Ready',
  'Served',
  'Completed',
  'Cancelled',
];

const GALLERY_CATEGORIES: GalleryCategory[] = [
  'Restaurant exterior',
  'Restaurant interior',
  'Food and signature dishes',
  'Drinks and refreshments',
  'Outdoor dining and terrace',
  'Live entertainment',
  'Restaurant atmosphere',
];

export function AdminDashboard({ open, onClose, onPublicDataChanged }: AdminDashboardProps) {
  // Token kept strictly in React memory (never persisted in localStorage/sessionStorage)
  const [token, setToken] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ mode: 'unclaimed', authenticated: false });
  const [passcodeInput, setPasscodeInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [store, setStore] = useState<AdminStorePayload | null>(null);
  const [loadingStore, setLoadingStore] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [actionNotice, setActionNotice] = useState('');

  // Orders filtering & layout toggle
  const [orderStatusFilter, setOrderStatusFilter] = useState<'All' | OrderStatus>('All');
  const [orderViewMode, setOrderViewMode] = useState<'grid' | 'list'>('grid');
  const [orderSearch, setOrderSearch] = useState('');

  // POS cart state
  const [posCart, setPosCart] = useState<Record<string, number>>({});
  const [posCategory, setPosCategory] = useState<'All' | MenuCategory>('All');
  const [posSearch, setPosSearch] = useState('');
  const [posServiceType, setPosServiceType] = useState<OrderServiceType>('Dine-In');
  const [posTableId, setPosTableId] = useState('');
  const [posCustomerName, setPosCustomerName] = useState('');

  // New Menu item form
  const [newDishName, setNewDishName] = useState('');
  const [newDishCat, setNewDishCat] = useState<MenuCategory>('Ghanaian Specialties');
  const [newDishPrice, setNewDishPrice] = useState('');
  const [newDishDesc, setNewDishDesc] = useState('');
  const [newDishImage, setNewDishImage] = useState('');

  // New Table form
  const [newTableName, setNewTableName] = useState('');
  const [newTableArea, setNewTableArea] = useState<TableArea>('Indoor Dining');
  const [newTableCap, setNewTableCap] = useState(4);

  // New Event form
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventPerformers, setNewEventPerformers] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');

  // New Gallery form
  const [newGalTitle, setNewGalTitle] = useState('');
  const [newGalCat, setNewGalCat] = useState<GalleryCategory>('Restaurant exterior');
  const [newGalImage, setNewGalImage] = useState('');
  const [newGalVerified, setNewGalVerified] = useState(true);

  // New FAQ form
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [newFaqCategory, setNewFaqCategory] = useState<FaqCategory>('Location & Parking');

  // Staff Passcode (RBAC)
  const [staffPasscodeInput, setStaffPasscodeInput] = useState('');

  useEffect(() => {
    if (!open) return;
    fetch('/api/auth/status', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data: AuthStatus) => setAuthStatus(data))
      .catch(() => {});
  }, [open, token]);

  const fetchAdminStore = async (activeToken: string) => {
    setLoadingStore(true);
    try {
      const resp = await fetch('/api/admin/store', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (resp.status === 401) {
        setToken(null);
        setStore(null);
        return;
      }
      const data = (await resp.json()) as AdminStorePayload;
      setStore(data);
    } finally {
      setLoadingStore(false);
    }
  };

  useEffect(() => {
    if (open && token) {
      fetchAdminStore(token);
    }
  }, [open, token]);

  const showToast = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(''), 3000);
  };

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    const endpoint = authStatus.mode === 'unclaimed' ? '/api/auth/setup' : '/api/auth/login';
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeInput }),
      });
      const data = (await resp.json()) as { token?: string; mode?: AuthStatus['mode']; error?: string };
      if (!resp.ok || !data.token) {
        setAuthError(data.error || 'Authentication failed.');
        return;
      }
      setToken(data.token);
      setAuthStatus({ mode: data.mode || 'claimed', authenticated: true });
      setPasscodeInput('');
    } catch {
      setAuthError('Network error while contacting server.');
    } finally {
      setAuthLoading(false);
    }
  };

  const authFetch = async (url: string, init: RequestInit = {}) => {
    if (!token) return null;
    const resp = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
    });
    if (resp.ok) {
      await fetchAdminStore(token);
      onPublicDataChanged();
    }
    return resp;
  };

  const handleImageFileUpload = (file: File | undefined, onLoaded: (dataUrl: string) => void) => {
    if (!file) return;
    if (file.size > 1_800_000) {
      showToast('Please select an image smaller than 1.8 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onLoaded(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const filteredOrders = useMemo(() => {
    if (!store) return [];
    const q = orderSearch.trim().toLowerCase();
    return store.orders.filter((o) => {
      const matchStatus = orderStatusFilter === 'All' || o.status === orderStatusFilter;
      const matchQuery =
        !q ||
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.items.some((i) => i.name.toLowerCase().includes(q));
      return matchStatus && matchQuery;
    });
  }, [store, orderStatusFilter, orderSearch]);

  const kdsTickets = useMemo(() => {
    if (!store) return [];
    return store.orders.filter((o) => o.status === 'Pending' || o.status === 'Preparing');
  }, [store]);

  const posFilteredMenu = useMemo(() => {
    if (!store) return [];
    const q = posSearch.trim().toLowerCase();
    return store.menu.filter((m) => {
      const catOk = posCategory === 'All' || m.category === posCategory;
      const qOk = !q || m.name.toLowerCase().includes(q);
      return m.available && catOk && qOk;
    });
  }, [store, posCategory, posSearch]);

  const posItemsList = useMemo(() => {
    if (!store) return [];
    return Object.entries(posCart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = store.menu.find((m) => m.id === id);
        return item ? { item, qty } : null;
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [store, posCart]);

  if (!open) return null;

  // Auth Gate Screen
  if (!token) {
    return (
      <div
        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Staff and Owner Portal Sign In"
      >
        <div className="w-full max-w-md bg-white text-slate-900 rounded-lg border border-slate-200 shadow-2xl p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Chop 'n Chill Operations
              </p>
              <h2 className="font-display text-2xl font-semibold text-slate-900 mt-1">
                {authStatus.mode === 'unclaimed'
                  ? 'First-Run Owner Setup'
                  : 'Staff & Owner Sign In'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close portal"
              className="w-9 h-9 inline-flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:text-slate-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-slate-600 mb-5 leading-relaxed">
            {authStatus.mode === 'unclaimed'
              ? 'No owner passcode has been set yet. Create your private administrative passcode (6+ characters) to lock and access the restaurant management dashboard.'
              : 'Enter your administrative passcode to manage menus, prices, POS orders, kitchen tickets, tables, gallery photos, events, and reservations.'}
          </p>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label htmlFor="owner-passcode" className="block text-xs font-semibold text-slate-700 mb-1.5">
                {authStatus.mode === 'unclaimed' ? 'Create Owner Passcode' : 'Owner Passcode'}
              </label>
              <input
                id="owner-passcode"
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 text-sm text-slate-900 focus:border-emerald-800 focus:outline-none min-h-[44px]"
              />
            </div>

            {authError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-md">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 px-4 rounded-md bg-[#173C30] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#1E4D3E] disabled:opacity-60 min-h-[46px]"
            >
              {authLoading
                ? 'Verifying...'
                : authStatus.mode === 'unclaimed'
                ? 'Claim Owner Portal'
                : 'Unlock Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const navItems: { id: AdminTab; label: string; icon: typeof LayoutGrid; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'orders', label: 'Live Orders', icon: ClipboardList, badge: store?.orders.filter((o) => o.status === 'Pending').length },
    { id: 'pos', label: 'POS Checkout', icon: CreditCard },
    { id: 'kds', label: 'Kitchen Display', icon: ChefHat, badge: kdsTickets.length },
    { id: 'tables', label: 'Tables & Floor', icon: Utensils },
    { id: 'menu', label: 'Menu & Prices', icon: Utensils },
    { id: 'events', label: 'Events & Gallery', icon: ImageIcon },
    { id: 'reservations', label: 'Reservations', icon: CalendarCheck, badge: store?.reservations.filter((r) => r.status === 'Pending').length },
    { id: 'inbox', label: 'Chats & Escalations', icon: MessageSquareText, badge: store?.analytics?.openEscalations },
    { id: 'ai', label: 'AI Concierge & KB', icon: Bot },
    { id: 'settings', label: 'Hours & Contact', icon: Settings },
  ];

  const completedSalesTotal = (store?.orders || [])
    .filter((o) => o.status === 'Completed' || o.status === 'Served')
    .reduce((sum, o) => sum + (o.totalCedi || 0), 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-50 text-slate-900 flex flex-col lg:flex-row overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Chop 'n Chill Restaurant Management Dashboard"
    >
      {/* Left Sidebar */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between shrink-0">
        <div className="p-4">
          <div className="flex items-center justify-between gap-3 mb-4 lg:mb-6">
            <div>
              <p className="font-display text-lg font-semibold text-slate-900">Chop 'n Chill Ops</p>
              <p className="text-xs text-slate-500">Kasoa Management Suite</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Return to website"
              className="lg:hidden px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-700"
            >
              Exit
            </button>
          </div>

          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-[#173C30] text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span
                      className={`font-mono text-[11px] tabular-nums px-1.5 py-0.5 rounded ${
                        active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:flex flex-col gap-2 p-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-3 rounded-md border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to Public Website
          </button>
          <button
            type="button"
            onClick={() => {
              setToken(null);
              setStore(null);
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium text-slate-500 hover:text-red-700"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {/* Top Breadcrumb Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-200">
          <div>
            <p className="text-xs text-slate-500">
              Chop &apos;n Chill Kasoa / Operations {store ? `· ${store.role === 'owner' ? 'Owner Access' : 'Staff Access'}` : ''}
            </p>
            <h1 className="font-sans text-xl sm:text-2xl font-bold text-slate-900">
              {navItems.find((n) => n.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {actionNotice && (
              <span className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md">
                {actionNotice}
              </span>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#173C30] text-white text-xs font-semibold hover:bg-[#1E4D3E] whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New POS Order</span>
            </button>
          </div>
        </div>

        {loadingStore || !store ? (
          <div className="py-20 text-center text-sm text-slate-500">Loading restaurant operations...</div>
        ) : (
          <>
            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 bg-white border border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Active Kitchen Tickets</p>
                    <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {kdsTickets.length}
                    </p>
                  </div>
                  <div className="p-5 bg-white border border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Available Tables</p>
                    <p className="font-mono text-2xl font-bold text-emerald-700 tabular-nums">
                      {store.tables.filter((t) => t.status === 'Available').length} / {store.tables.length}
                    </p>
                  </div>
                  <div className="p-5 bg-white border border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Pending Reservations</p>
                    <p className="font-mono text-2xl font-bold text-amber-700 tabular-nums">
                      {store.reservations.filter((r) => r.status === 'Pending').length}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {store.analytics.aiCreatedReservations} via AI Concierge
                    </p>
                  </div>
                  <div className="p-5 bg-white border border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">AI Concierge Activity</p>
                    <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {store.analytics.totalConversations}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {store.analytics.voiceConversations} voice · {store.analytics.openEscalations} open handoffs · GH₵ {completedSalesTotal.toFixed(2)} sales
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-lg p-5">
                    <h2 className="font-sans text-base font-semibold text-slate-900 mb-4">
                      Recent Order Activity
                    </h2>
                    {store.orders.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No orders logged yet. Create a walk-in order in POS Checkout or await web enquiries.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {store.orders.slice(0, 5).map((o) => (
                          <div key={o.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                            <div>
                              <p className="font-medium text-slate-900">
                                {o.id} · {o.customerName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {o.serviceType} · {o.items.reduce((s, i) => s + i.qty, 0)} item(s)
                              </p>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-800">
                              {o.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-5">
                    <h2 className="font-sans text-base font-semibold text-slate-900 mb-4">
                      Table Status Summary
                    </h2>
                    <div className="divide-y divide-slate-100">
                      {store.tables.map((t) => (
                        <div key={t.id} className="py-2.5 flex items-center justify-between text-sm">
                          <div>
                            <span className="font-mono font-semibold text-slate-900 mr-2">{t.id}</span>
                            <span className="text-slate-700">{t.name}</span>
                            <span className="text-xs text-slate-500 ml-2">({t.area})</span>
                          </div>
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded ${
                              t.status === 'Available'
                                ? 'bg-emerald-50 text-emerald-700'
                                : t.status === 'Occupied'
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-blue-50 text-blue-800'
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LIVE ORDERS */}
            {activeTab === 'orders' && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1 p-1 bg-white border border-slate-200 rounded-md">
                    {(['All', ...ORDER_STATUSES] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setOrderStatusFilter(st)}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                          orderStatusFilter === st
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        placeholder="Search order ID or guest..."
                        className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-md text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setOrderViewMode('grid')}
                      aria-label="Grid view"
                      className={`p-2 rounded-md border ${
                        orderViewMode === 'grid'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderViewMode('list')}
                      aria-label="List view"
                      className={`p-2 rounded-md border ${
                        orderViewMode === 'list'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                    <p className="text-sm text-slate-500 mb-3">No orders match this status filter.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('pos')}
                      className="px-4 py-2 rounded-md bg-[#173C30] text-white text-xs font-semibold"
                    >
                      Create Walk-In POS Order
                    </button>
                  </div>
                ) : orderViewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredOrders.map((o) => (
                      <div key={o.id} className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-mono text-xs font-semibold text-slate-900">{o.id}</span>
                            <span className="text-xs text-slate-500">{o.serviceType}{o.tableId ? ` · ${o.tableId}` : ''}</span>
                          </div>
                          <p className="font-semibold text-sm text-slate-900">{o.customerName}</p>
                          <ul className="mt-3 space-y-1 text-xs text-slate-600">
                            {o.items.map((it, idx) => (
                              <li key={idx} className="flex justify-between">
                                <span>{it.qty}x {it.name}</span>
                                <span className="font-mono tabular-nums">
                                  {it.unitPriceCedi !== null ? `GH₵ ${(it.unitPriceCedi * it.qty).toFixed(2)}` : 'TBD'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                            {o.totalCedi !== null ? `GH₵ ${o.totalCedi.toFixed(2)}` : 'Price TBD'}
                          </span>
                          <select
                            value={o.status}
                            aria-label={`Status for ${o.id}`}
                            onChange={async (e) => {
                              await authFetch(`/api/admin/orders/${o.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ status: e.target.value }),
                              });
                              showToast(`${o.id} updated`);
                            }}
                            className="px-2.5 py-1.5 rounded border border-slate-300 text-xs font-medium bg-white"
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="py-3 px-4">Order ID</th>
                          <th className="py-3 px-4">Guest</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Items</th>
                          <th className="py-3 px-4 text-right">Total</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredOrders.map((o) => (
                          <tr key={o.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-semibold">{o.id}</td>
                            <td className="py-3 px-4">{o.customerName}</td>
                            <td className="py-3 px-4">{o.serviceType}</td>
                            <td className="py-3 px-4">{o.items.map((i) => `${i.qty}x ${i.name}`).join(', ')}</td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums">
                              {o.totalCedi !== null ? `GH₵ ${o.totalCedi.toFixed(2)}` : 'TBD'}
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={o.status}
                                onChange={async (e) => {
                                  await authFetch(`/api/admin/orders/${o.id}`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ status: e.target.value }),
                                  });
                                }}
                                className="px-2 py-1 rounded border border-slate-300 bg-white"
                              >
                                {ORDER_STATUSES.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* POS WORKFLOW */}
            {activeTab === 'pos' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1 p-1 bg-white border border-slate-200 rounded-md">
                      {(['All', ...MENU_CATEGORIES] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setPosCategory(c)}
                          className={`px-2.5 py-1.5 text-xs font-medium rounded ${
                            posCategory === c ? 'bg-slate-900 text-white' : 'text-slate-600'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    <input
                      type="search"
                      value={posSearch}
                      onChange={(e) => setPosSearch(e.target.value)}
                      placeholder="Filter menu..."
                      className="px-3 py-2 bg-white border border-slate-200 rounded-md text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {posFilteredMenu.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setPosCart((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))
                        }
                        className="text-left p-4 bg-white border border-slate-200 hover:border-[#173C30] rounded-lg transition-colors flex flex-col justify-between gap-2"
                      >
                        <div>
                          <p className="text-[11px] text-slate-500">{item.category}</p>
                          <p className="font-semibold text-sm text-slate-900 mt-0.5">{item.name}</p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="font-mono text-xs font-semibold text-emerald-800 tabular-nums">
                            {item.priceCedi !== null ? `GH₵ ${item.priceCedi.toFixed(2)}` : 'Price TBD'}
                          </span>
                          <span className="text-xs font-semibold text-[#173C30]">+ Add</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between h-fit">
                  <div>
                    <h2 className="font-sans text-base font-bold text-slate-900 pb-3 border-b border-slate-200">
                      Current POS Ticket
                    </h2>

                    <div className="grid grid-cols-3 gap-1.5 my-3">
                      {(['Dine-In', 'Takeaway', 'Delivery'] as OrderServiceType[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setPosServiceType(st)}
                          className={`py-2 text-xs font-medium rounded border ${
                            posServiceType === st
                              ? 'bg-[#173C30] text-white border-[#173C30]'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    {posServiceType === 'Dine-In' && (
                      <select
                        value={posTableId}
                        onChange={(e) => setPosTableId(e.target.value)}
                        className="w-full px-3 py-2 mb-3 border border-slate-200 rounded-md text-xs bg-white"
                      >
                        <option value="">Select Table (Optional)</option>
                        {store.tables.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.id} — {t.name} ({t.status})
                          </option>
                        ))}
                      </select>
                    )}

                    <input
                      type="text"
                      value={posCustomerName}
                      onChange={(e) => setPosCustomerName(e.target.value)}
                      placeholder="Guest Name / Label"
                      className="w-full px-3 py-2 mb-4 border border-slate-200 rounded-md text-xs"
                    />

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {posItemsList.length === 0 ? (
                        <p className="text-xs text-slate-500 py-6 text-center">
                          Tap dishes on the left to add them to this POS ticket.
                        </p>
                      ) : (
                        posItemsList.map(({ item, qty }) => (
                          <div key={item.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                            <span className="font-medium text-slate-800">{item.name}</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setPosCart((p) => ({ ...p, [item.id]: Math.max(0, (p[item.id] || 0) - 1) }))
                                }
                                className="w-6 h-6 rounded border border-slate-300"
                              >
                                -
                              </button>
                              <span className="font-mono tabular-nums w-4 text-center">{qty}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setPosCart((p) => ({ ...p, [item.id]: (p[item.id] || 0) + 1 }))
                                }
                                className="w-6 h-6 rounded border border-slate-300"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-200 space-y-3">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Ticket Total</span>
                      <span className="font-mono tabular-nums">
                        {posItemsList.length > 0 && posItemsList.every((x) => x.item.priceCedi !== null)
                          ? `GH₵ ${posItemsList
                              .reduce((s, x) => s + (x.item.priceCedi || 0) * x.qty, 0)
                              .toFixed(2)}`
                          : 'Price TBD'}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={posItemsList.length === 0}
                      onClick={async () => {
                        const resp = await authFetch('/api/admin/orders', {
                          method: 'POST',
                          body: JSON.stringify({
                            customerName: posCustomerName || 'Walk-In Guest',
                            serviceType: posServiceType,
                            tableId: posServiceType === 'Dine-In' ? posTableId : undefined,
                            items: posItemsList.map((x) => ({ menuItemId: x.item.id, qty: x.qty })),
                          }),
                        });
                        if (resp?.ok) {
                          setPosCart({});
                          setPosCustomerName('');
                          showToast('POS ticket sent to Kitchen Display');
                        }
                      }}
                      className="w-full py-3 rounded-md bg-[#173C30] text-white text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
                    >
                      Send Ticket to Kitchen
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* KITCHEN DISPLAY SYSTEM */}
            {activeTab === 'kds' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Active kitchen queue showing Pending and Preparing tickets in real time.
                </p>
                {kdsTickets.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-sm text-slate-500">
                    All kitchen tickets are clear.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {kdsTickets.map((t) => (
                      <div key={t.id} className="bg-white border border-slate-300 rounded-lg p-5 flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span className="font-mono text-sm font-bold text-slate-900">{t.id}</span>
                            <span
                              className={`text-xs font-semibold px-2.5 py-0.5 rounded ${
                                t.status === 'Pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            {t.serviceType} {t.tableId ? `· ${t.tableId}` : ''} · {t.customerName}
                          </p>
                          <ul className="mt-3 space-y-2 text-sm font-medium text-slate-900">
                            {t.items.map((it, idx) => (
                              <li key={idx} className="flex justify-between">
                                <span>
                                  <span className="font-mono text-emerald-800 mr-2">{it.qty}x</span>
                                  {it.name}
                                </span>
                              </li>
                            ))}
                          </ul>
                          {t.notes && (
                            <p className="mt-3 text-xs text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded">
                              Note: {t.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-slate-100">
                          {t.status === 'Pending' && (
                            <button
                              type="button"
                              onClick={() =>
                                authFetch(`/api/admin/orders/${t.id}`, {
                                  method: 'PATCH',
                                  body: JSON.stringify({ status: 'Preparing' }),
                                })
                              }
                              className="flex-1 py-2.5 rounded-md bg-slate-900 text-white text-xs font-semibold"
                            >
                              Start Preparing
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              authFetch(`/api/admin/orders/${t.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ status: 'Ready' }),
                              })
                            }
                            className="flex-1 py-2.5 rounded-md bg-[#173C30] text-white text-xs font-semibold"
                          >
                            Mark Ready
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TABLES */}
            {activeTab === 'tables' && (
              <div className="space-y-6">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newTableName.trim()) return;
                    const resp = await authFetch('/api/admin/tables', {
                      method: 'POST',
                      body: JSON.stringify({ name: newTableName, area: newTableArea, capacity: newTableCap }),
                    });
                    if (resp?.ok) {
                      setNewTableName('');
                      showToast('Table added');
                    }
                  }}
                  className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-end gap-3"
                >
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Table Name</label>
                    <input
                      type="text"
                      value={newTableName}
                      onChange={(e) => setNewTableName(e.target.value)}
                      placeholder="Terrace Lounge 06"
                      className="px-3 py-2 border border-slate-300 rounded-md text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Area</label>
                    <select
                      value={newTableArea}
                      onChange={(e) => setNewTableArea(e.target.value as TableArea)}
                      className="px-3 py-2 border border-slate-300 rounded-md text-xs bg-white"
                    >
                      <option value="Indoor Dining">Indoor Dining</option>
                      <option value="Outdoor Dining">Outdoor Dining</option>
                      <option value="Upstairs Terrace">Upstairs Terrace</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Seats</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={newTableCap}
                      onChange={(e) => setNewTableCap(Number(e.target.value))}
                      className="w-20 px-3 py-2 border border-slate-300 rounded-md text-xs tabular-nums"
                    />
                  </div>
                  <button type="submit" className="px-4 py-2 rounded-md bg-[#173C30] text-white text-xs font-semibold">
                    + Add Table
                  </button>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {store.tables.map((t) => (
                    <div key={t.id} className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold">{t.id}</span>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded ${
                            t.status === 'Available'
                              ? 'bg-emerald-50 text-emerald-700'
                              : t.status === 'Occupied'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-blue-50 text-blue-800'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{t.name}</p>
                        <p className="text-xs text-slate-500">
                          {t.area} · {t.capacity} Seats
                        </p>
                      </div>
                      <select
                        value={t.status}
                        onChange={(e) =>
                          authFetch(`/api/admin/tables/${t.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ status: e.target.value as TableStatus }),
                          })
                        }
                        className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs bg-white"
                      >
                        <option value="Available">Available</option>
                        <option value="Occupied">Occupied</option>
                        <option value="Reserved">Reserved</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MENU MANAGER */}
            {activeTab === 'menu' && (
              <div className="space-y-6">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newDishName.trim()) return;
                    const resp = await authFetch('/api/admin/menu', {
                      method: 'POST',
                      body: JSON.stringify({
                        name: newDishName,
                        category: newDishCat,
                        priceCedi: newDishPrice.trim() ? Number(newDishPrice) : null,
                        description: newDishDesc || 'Editable dish description.',
                        image: newDishImage,
                        imageVerified: Boolean(newDishImage),
                      }),
                    });
                    if (resp?.ok) {
                      setNewDishName('');
                      setNewDishPrice('');
                      setNewDishDesc('');
                      setNewDishImage('');
                      showToast('Dish added to live menu');
                    }
                  }}
                  className="bg-white border border-slate-200 rounded-lg p-5 space-y-3"
                >
                  <h2 className="font-sans text-sm font-bold text-slate-900">Add New Menu Item</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <input
                      type="text"
                      value={newDishName}
                      onChange={(e) => setNewDishName(e.target.value)}
                      placeholder="Dish Name *"
                      required
                      className="px-3 py-2 border border-slate-300 rounded-md text-xs"
                    />
                    <select
                      value={newDishCat}
                      onChange={(e) => setNewDishCat(e.target.value as MenuCategory)}
                      className="px-3 py-2 border border-slate-300 rounded-md text-xs bg-white"
                    >
                      {MENU_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newDishPrice}
                      onChange={(e) => setNewDishPrice(e.target.value)}
                      placeholder="Price in GH₵ (leave blank if TBD)"
                      className="px-3 py-2 border border-slate-300 rounded-md text-xs"
                    />
                    <input
                      type="text"
                      value={newDishImage}
                      onChange={(e) => setNewDishImage(e.target.value)}
                      placeholder="Photo URL or upload below"
                      className="px-3 py-2 border border-slate-300 rounded-md text-xs"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      value={newDishDesc}
                      onChange={(e) => setNewDishDesc(e.target.value)}
                      placeholder="Short description..."
                      className="flex-1 min-w-[200px] px-3 py-2 border border-slate-300 rounded-md text-xs"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileUpload(e.target.files?.[0], setNewDishImage)}
                      className="text-xs text-slate-600"
                    />
                    <button type="submit" className="px-4 py-2 rounded-md bg-[#173C30] text-white text-xs font-semibold">
                      + Add Dish
                    </button>
                  </div>
                </form>

                <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {store.menu.map((item) => (
                    <div key={item.id} className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                      <div className="lg:col-span-3">
                        <input
                          type="text"
                          defaultValue={item.name}
                          onBlur={(e) => {
                            if (e.target.value !== item.name) {
                              authFetch(`/api/admin/menu/${item.id}`, {
                                method: 'PUT',
                                body: JSON.stringify({ name: e.target.value }),
                              });
                            }
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">{item.category}</p>
                      </div>
                      <div className="lg:col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Price TBD"
                          defaultValue={item.priceCedi ?? ''}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            authFetch(`/api/admin/menu/${item.id}`, {
                              method: 'PUT',
                              body: JSON.stringify({ priceCedi: val === '' ? null : Number(val) }),
                            });
                            showToast(`Updated price for ${item.name}`);
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-mono tabular-nums"
                        />
                      </div>
                      <div className="lg:col-span-4">
                        <input
                          type="text"
                          defaultValue={item.description}
                          onBlur={(e) => {
                            if (e.target.value !== item.description) {
                              authFetch(`/api/admin/menu/${item.id}`, {
                                method: 'PUT',
                                body: JSON.stringify({ description: e.target.value }),
                              });
                            }
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs"
                        />
                      </div>
                      <div className="lg:col-span-3 flex items-center justify-end gap-2">
                        <label className="inline-flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.available}
                            onChange={(e) =>
                              authFetch(`/api/admin/menu/${item.id}`, {
                                method: 'PUT',
                                body: JSON.stringify({ available: e.target.checked }),
                              })
                            }
                          />
                          <span>In Stock</span>
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          aria-label={`Upload photo for ${item.name}`}
                          onChange={(e) =>
                            handleImageFileUpload(e.target.files?.[0], (url) => {
                              authFetch(`/api/admin/menu/${item.id}`, {
                                method: 'PUT',
                                body: JSON.stringify({ image: url, imageVerified: true }),
                              });
                              showToast(`Updated photo for ${item.name}`);
                            })
                          }
                          className="w-24 text-[11px]"
                        />
                        <button
                          type="button"
                          onClick={() => authFetch(`/api/admin/menu/${item.id}`, { method: 'DELETE' })}
                          aria-label={`Delete ${item.name}`}
                          className="p-1.5 rounded text-slate-400 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EVENTS & GALLERY */}
            {activeTab === 'events' && (
              <div className="space-y-8">
                <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                  <h2 className="font-sans text-base font-bold text-slate-900">Upcoming Live-Band &amp; Lounge Events</h2>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newEventTitle.trim()) return;
                      const resp = await authFetch('/api/admin/events', {
                        method: 'POST',
                        body: JSON.stringify({
                          title: newEventTitle,
                          date: newEventDate || 'Date TBD',
                          startTime: newEventTime || 'Time TBD',
                          performers: newEventPerformers || 'Performers TBD',
                          description: newEventDesc,
                        }),
                      });
                      if (resp?.ok) {
                        setNewEventTitle('');
                        setNewEventDate('');
                        setNewEventTime('');
                        setNewEventPerformers('');
                        setNewEventDesc('');
                        showToast('Event added');
                      }
                    }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-4 border-b border-slate-100"
                  >
                    <input
                      type="text"
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      placeholder="Event Title *"
                      required
                      className="px-3 py-2 border border-slate-300 rounded-md text-xs"
                    />
                    <input
                      type="text"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      placeholder="Date (e.g. Friday, Nov 27)"
                      className="px-3 py-2 border border-slate-300 rounded-md text-xs"
                    />
                    <input
                      type="text"
                      value={newEventTime}
                      onChange={(e) => setNewEventTime(e.target.value)}
                      placeholder="Start Time (e.g. 7:30 PM)"
                      className="px-3 py-2 border border-slate-300 rounded-md text-xs"
                    />
                    <input
                      type="text"
                      value={newEventPerformers}
                      onChange={(e) => setNewEventPerformers(e.target.value)}
                      placeholder="Featured Performers"
                      className="px-3 py-2 border border-slate-300 rounded-md text-xs"
                    />
                    <input
                      type="text"
                      value={newEventDesc}
                      onChange={(e) => setNewEventDesc(e.target.value)}
                      placeholder="Event Description"
                      className="sm:col-span-3 px-3 py-2 border border-slate-300 rounded-md text-xs"
                    />
                    <button type="submit" className="px-4 py-2 rounded-md bg-[#173C30] text-white text-xs font-semibold">
                      + Publish Event
                    </button>
                  </form>

                  <div className="divide-y divide-slate-100">
                    {store.events.map((ev) => (
                      <div key={ev.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{ev.title}</p>
                          <p className="text-slate-500">
                            {ev.date} · {ev.startTime} · {ev.performers}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => authFetch(`/api/admin/events/${ev.id}`, { method: 'DELETE' })}
                          className="px-3 py-1.5 rounded border border-slate-200 text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                  <h2 className="font-sans text-base font-bold text-slate-900">Gallery Photographs</h2>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newGalTitle.trim() || !newGalImage.trim()) return;
                      const resp = await authFetch('/api/admin/gallery', {
                        method: 'POST',
                        body: JSON.stringify({
                          title: newGalTitle,
                          category: newGalCat,
                          image: newGalImage,
                          caption: newGalTitle,
                          isVerifiedVenuePhoto: newGalVerified,
                        }),
                      });
                      if (resp?.ok) {
                        setNewGalTitle('');
                        setNewGalImage('');
                        showToast('Gallery photo added');
                      }
                    }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-4 border-b border-slate-100 items-center"
                  >
                    <input
                      type="text"
                      value={newGalTitle}
                      onChange={(e) => setNewGalTitle(e.target.value)}
                      placeholder="Photo Title *"
                      required
                      className="px-3 py-2 border border-slate-300 rounded-md text-xs"
                    />
                    <select
                      value={newGalCat}
                      onChange={(e) => setNewGalCat(e.target.value as GalleryCategory)}
                      className="px-3 py-2 border border-slate-300 rounded-md text-xs bg-white"
                    >
                      {GALLERY_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newGalImage}
                      onChange={(e) => setNewGalImage(e.target.value)}
                      placeholder="Image URL or upload file"
                      className="px-3 py-2 border border-slate-300 rounded-md text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileUpload(e.target.files?.[0], setNewGalImage)}
                        className="text-xs w-full"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700 sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={newGalVerified}
                        onChange={(e) => setNewGalVerified(e.target.checked)}
                      />
                      <span>Mark as Verified On-Site Chop 'n Chill Photograph</span>
                    </label>
                    <button type="submit" className="sm:col-span-2 px-4 py-2 rounded-md bg-[#173C30] text-white text-xs font-semibold">
                      + Add Gallery Photo
                    </button>
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {store.gallery.map((g) => (
                      <div key={g.id} className="border border-slate-200 rounded-lg overflow-hidden">
                        <img src={g.image} alt={g.title} className="w-full h-36 object-cover" />
                        <div className="p-3 flex items-center justify-between gap-2 text-xs">
                          <div>
                            <p className="font-semibold text-slate-900">{g.title}</p>
                            <p className="text-slate-500">{g.category}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => authFetch(`/api/admin/gallery/${g.id}`, { method: 'DELETE' })}
                            className="p-1.5 text-slate-400 hover:text-red-700"
                            aria-label={`Remove ${g.title}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* RESERVATIONS INBOX */}
            {activeTab === 'reservations' && (
              <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                {store.reservations.length === 0 ? (
                  <p className="p-10 text-center text-sm text-slate-500">
                    No reservation requests submitted yet.
                  </p>
                ) : (
                  store.reservations.map((r) => (
                    <div key={r.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="font-mono text-xs text-slate-500">
                          {r.id} · {r.source || 'Web Form'}
                        </p>
                        <p className="font-semibold text-slate-900">
                          {r.name} · {r.phone}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {r.date} at {r.time} · {r.guests} Guest(s) · {r.seatingPreference}
                        </p>
                        {r.specialRequests && (
                          <p className="text-xs text-slate-500 mt-1">Requests: {r.specialRequests}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://wa.me/${r.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Hello ${r.name}, this is Chop 'n Chill Restaurant & Lounge Kasoa regarding your reservation request (${r.id}) for ${r.guests} guest(s) on ${r.date} at ${r.time}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded border border-emerald-700 text-emerald-800 text-xs font-medium hover:bg-emerald-50"
                        >
                          Reply WhatsApp
                        </a>
                        <select
                          value={r.status}
                          onChange={(e) =>
                            authFetch(`/api/admin/reservations/${r.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ status: e.target.value as ReservationStatus }),
                            })
                          }
                          className="px-2.5 py-1.5 rounded border border-slate-300 text-xs bg-white"
                        >
                          <option value="Pending">Pending (Needs Staff Confirmation)</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Declined">Declined</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* CHATS & HUMAN ESCALATIONS INBOX */}
            {activeTab === 'inbox' && (
              <div className="space-y-8">
                <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <h2 className="font-sans text-base font-bold text-slate-900">
                        Human Assistance Escalations
                      </h2>
                      <p className="text-xs text-slate-500">
                        Requests logged when visitors ask for a staff member or unconfirmed event/deposit details.
                      </p>
                    </div>
                    <span className="font-mono text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded">
                      {store.escalations.filter((e) => e.status === 'Open').length} Open
                    </span>
                  </div>

                  {store.escalations.length === 0 ? (
                    <p className="text-sm text-slate-500 py-6 text-center">
                      No human staff escalations logged yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {store.escalations.map((esc) => (
                        <div key={esc.id} className="py-4 flex flex-wrap items-start justify-between gap-4">
                          <div className="max-w-2xl">
                            <p className="font-mono text-xs text-slate-500">
                              {esc.id} · {new Date(esc.createdAt).toLocaleString()}
                            </p>
                            <p className="font-semibold text-sm text-slate-900 mt-0.5">
                              {esc.guestName} ({esc.guestContact})
                            </p>
                            <p className="text-xs font-medium text-emerald-800 mt-0.5">{esc.reason}</p>
                            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{esc.summary}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              authFetch(`/api/admin/escalations/${esc.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({
                                  status: esc.status === 'Open' ? 'Resolved' : 'Open',
                                }),
                              })
                            }
                            className={`px-3 py-1.5 rounded text-xs font-semibold border ${
                              esc.status === 'Open'
                                ? 'border-emerald-700 text-emerald-800 hover:bg-emerald-50'
                                : 'border-slate-300 text-slate-600 bg-slate-50'
                            }`}
                          >
                            {esc.status === 'Open' ? 'Mark Resolved' : 'Resolved (Reopen)'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <h2 className="font-sans text-base font-bold text-slate-900">
                        AI Concierge Conversation History
                      </h2>
                      <p className="text-xs text-slate-500">
                        Payment card numbers are automatically blocked/redacted. Logs expire automatically after {store.aiConfig.retentionDays} day(s).
                      </p>
                    </div>
                    {store.role === 'owner' && store.conversations.length > 0 && (
                      <button
                        type="button"
                        onClick={async () => {
                          await authFetch('/api/admin/conversations', { method: 'DELETE' });
                          showToast('All conversation logs purged');
                        }}
                        className="px-3 py-1.5 rounded border border-red-300 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Purge All Logs
                      </button>
                    )}
                  </div>

                  {store.conversations.length === 0 ? (
                    <p className="text-sm text-slate-500 py-6 text-center">
                      No AI Concierge conversations recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {store.conversations.map((conv) => (
                        <div key={conv.id} className="p-4 border border-slate-200 rounded-md space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-slate-900">{conv.id}</span>
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase text-[11px]">
                                {conv.channel}
                              </span>
                              {conv.escalatedToHuman && (
                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-semibold">
                                  Escalated
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-slate-500">
                              <span>{new Date(conv.lastMessageAt).toLocaleString()}</span>
                              {store.role === 'owner' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    authFetch(`/api/admin/conversations/${conv.id}`, {
                                      method: 'DELETE',
                                    })
                                  }
                                  className="text-red-700 hover:underline"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1.5 max-h-44 overflow-y-auto pt-2 border-t border-slate-100 text-xs">
                            {conv.turns.map((t, idx) => (
                              <div key={idx} className="leading-relaxed">
                                <span className="font-semibold text-slate-900 mr-1.5">
                                  {t.role === 'user' ? 'Guest:' : 'Concierge:'}
                                </span>
                                <span className="text-slate-700">{t.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI CONCIERGE & KNOWLEDGE BASE CONFIGURATION */}
            {activeTab === 'ai' && (
              <div className="space-y-6 max-w-3xl">
                {store.role !== 'owner' && (
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 shrink-0" />
                    <span>
                      Signed in with Staff Access. Only the Owner passcode can modify AI personality, voice availability, knowledge base, or staff passcodes.
                    </span>
                  </div>
                )}

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const resp = await authFetch('/api/admin/ai-config', {
                      method: 'PUT',
                      body: JSON.stringify({
                        receptionistName: fd.get('receptionistName'),
                        personalityPrompt: fd.get('personalityPrompt'),
                        customKnowledgeBase: fd.get('customKnowledgeBase'),
                        voiceEnabled: fd.get('voiceEnabled') === 'on',
                        retentionDays: Number(fd.get('retentionDays')),
                      }),
                    });
                    if (resp?.ok) showToast('AI Concierge settings saved');
                  }}
                  className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
                >
                  <h2 className="font-sans text-base font-bold text-slate-900">
                    AI Concierge Personality, Voice &amp; Knowledge Base
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Receptionist Name
                      </label>
                      <input
                        name="receptionistName"
                        disabled={store.role !== 'owner'}
                        defaultValue={store.aiConfig.receptionistName}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Transcript Retention (Days)
                      </label>
                      <input
                        name="retentionDays"
                        type="number"
                        min={1}
                        max={90}
                        disabled={store.role !== 'owner'}
                        defaultValue={store.aiConfig.retentionDays}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm tabular-nums disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Personality &amp; Communication Style
                    </label>
                    <textarea
                      name="personalityPrompt"
                      rows={3}
                      disabled={store.role !== 'owner'}
                      defaultValue={store.aiConfig.personalityPrompt}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm disabled:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Restaurant Knowledge Base Notes (Parking, Policies, Specials, Lounge Tips)
                    </label>
                    <textarea
                      name="customKnowledgeBase"
                      rows={5}
                      disabled={store.role !== 'owner'}
                      defaultValue={store.aiConfig.customKnowledgeBase}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm disabled:bg-slate-50"
                    />
                  </div>

                  <label className="inline-flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      name="voiceEnabled"
                      disabled={store.role !== 'owner'}
                      defaultChecked={store.aiConfig.voiceEnabled}
                    />
                    <span>Enable Real-Time Voice Concierge (Microphone Live Audio)</span>
                  </label>

                  {store.role === 'owner' && (
                    <div className="pt-2">
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-md bg-[#173C30] text-white text-xs font-semibold uppercase tracking-wider"
                      >
                        Save AI Configuration
                      </button>
                    </div>
                  )}
                </form>

                {store.role === 'owner' && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const resp = await authFetch('/api/admin/staff-passcode', {
                        method: 'PUT',
                        body: JSON.stringify({ passcode: staffPasscodeInput }),
                      });
                      if (resp?.ok) {
                        setStaffPasscodeInput('');
                        showToast(
                          staffPasscodeInput.trim()
                            ? 'Staff access passcode updated'
                            : 'Staff passcode cleared'
                        );
                      }
                    }}
                    className="bg-white border border-slate-200 rounded-lg p-6 space-y-3"
                  >
                    <h2 className="font-sans text-base font-bold text-slate-900">
                      Role-Based Staff Passcode (RBAC)
                    </h2>
                    <p className="text-xs text-slate-600">
                      Status:{' '}
                      <strong>
                        {store.staffPasscodeConfigured
                          ? 'Active — hosts/cashiers can sign in with Staff Passcode without Owner security access.'
                          : 'Not configured — set a 6+ character passcode for hosts and kitchen staff.'}
                      </strong>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="password"
                        value={staffPasscodeInput}
                        onChange={(e) => setStaffPasscodeInput(e.target.value)}
                        placeholder="New staff passcode (6+ chars, or blank to disable)"
                        className="flex-1 min-w-[220px] px-3 py-2 border border-slate-300 rounded-md text-xs"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-md bg-slate-900 text-white text-xs font-semibold"
                      >
                        Update Staff Access
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* SETTINGS */}
            {activeTab === 'settings' && (
              <>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const fd = new FormData(form);
                  const socials = store.settings.socials.map((s, idx) => ({
                    id: s.id,
                    label: String(fd.get(`soc_label_${idx}`) || s.label),
                    url: String(fd.get(`soc_url_${idx}`) || ''),
                  }));
                  const resp = await authFetch('/api/admin/settings', {
                    method: 'PUT',
                    body: JSON.stringify({
                      address: fd.get('address'),
                      phone: fd.get('phone'),
                      openingHours: fd.get('openingHours'),
                      deliveryNote: fd.get('deliveryNote'),
                      socials,
                    }),
                  });
                  if (resp?.ok) showToast('Restaurant settings saved');
                }}
                className="bg-white border border-slate-200 rounded-lg p-6 max-w-2xl space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                  <input
                    name="address"
                    defaultValue={store.settings.address}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telephone</label>
                  <input
                    name="phone"
                    defaultValue={store.settings.phone}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Hours</label>
                  <input
                    name="openingHours"
                    defaultValue={store.settings.openingHours}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Service &amp; Delivery Note</label>
                  <input
                    name="deliveryNote"
                    defaultValue={store.settings.deliveryNote}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                </div>
                <div className="pt-2 border-t border-slate-200 space-y-3">
                  <p className="text-xs font-semibold text-slate-700">Social Media Links</p>
                  {store.settings.socials.map((s, idx) => (
                    <div key={s.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        name={`soc_label_${idx}`}
                        defaultValue={s.label}
                        className="px-3 py-2 border border-slate-300 rounded-md text-xs"
                      />
                      <input
                        name={`soc_url_${idx}`}
                        defaultValue={s.url}
                        placeholder="https://..."
                        className="px-3 py-2 border border-slate-300 rounded-md text-xs"
                      />
                    </div>
                  ))}
                </div>
                <button type="submit" className="px-5 py-2.5 rounded-md bg-[#173C30] text-white text-xs font-semibold uppercase tracking-wider">
                  Save Settings
                </button>
              </form>

              <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-2xl mt-6 space-y-4">
                <h2 className="font-sans text-base font-bold text-slate-900">
                  Manage Frequently Asked Questions
                </h2>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;
                    const resp = await authFetch('/api/admin/faqs', {
                      method: 'POST',
                      body: JSON.stringify({
                        question: newFaqQuestion,
                        answer: newFaqAnswer,
                        category: newFaqCategory,
                        isPlaceholder: false,
                      }),
                    });
                    if (resp?.ok) {
                      setNewFaqQuestion('');
                      setNewFaqAnswer('');
                      showToast('FAQ item added');
                    }
                  }}
                  className="space-y-3 pb-4 border-b border-slate-100"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newFaqQuestion}
                      onChange={(e) => setNewFaqQuestion(e.target.value)}
                      placeholder="Question *"
                      required
                      className="sm:col-span-2 px-3 py-2 border border-slate-300 rounded-md text-xs"
                    />
                    <select
                      value={newFaqCategory}
                      onChange={(e) => setNewFaqCategory(e.target.value as FaqCategory)}
                      className="px-3 py-2 border border-slate-300 rounded-md text-xs bg-white"
                    >
                      <option value="Reservations">Reservations</option>
                      <option value="Menu & Dietary">Menu &amp; Dietary</option>
                      <option value="Location & Parking">Location &amp; Parking</option>
                      <option value="Lounge & Live Band">Lounge &amp; Live Band</option>
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    value={newFaqAnswer}
                    onChange={(e) => setNewFaqAnswer(e.target.value)}
                    placeholder="Verified answer *"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-[#173C30] text-white text-xs font-semibold"
                  >
                    + Add FAQ
                  </button>
                </form>

                <div className="space-y-4">
                  {store.faqs.map((faq) => (
                    <div key={faq.id} className="p-3.5 border border-slate-200 rounded-md space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-emerald-800">{faq.category}</span>
                        <button
                          type="button"
                          onClick={() => authFetch(`/api/admin/faqs/${faq.id}`, { method: 'DELETE' })}
                          className="text-xs text-red-700 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        type="text"
                        defaultValue={faq.question}
                        onBlur={(e) => {
                          if (e.target.value !== faq.question) {
                            authFetch(`/api/admin/faqs/${faq.id}`, {
                              method: 'PUT',
                              body: JSON.stringify({ question: e.target.value, isPlaceholder: false }),
                            });
                            showToast('FAQ updated');
                          }
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold"
                      />
                      <textarea
                        rows={2}
                        defaultValue={faq.answer}
                        onBlur={(e) => {
                          if (e.target.value !== faq.answer) {
                            authFetch(`/api/admin/faqs/${faq.id}`, {
                              method: 'PUT',
                              body: JSON.stringify({ answer: e.target.value, isPlaceholder: false }),
                            });
                            showToast('FAQ answer saved');
                          }
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-700"
                      />
                    </div>
                  ))}
                </div>
              </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
