import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DiningTable,
  EventItem,
  GalleryItem,
  MENU_CATEGORIES,
  MenuItem,
  OrderLineItem,
  OrderRecord,
  OrderStatus,
  ReservationRequest,
  ReservationStatus,
  RestaurantSettings,
} from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, 'data');
const STORE_PATH = path.resolve(DATA_DIR, 'store.json');

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

interface PersistedStore {
  adminCredentialHash: string | null;
  settings: RestaurantSettings;
  menu: MenuItem[];
  events: EventItem[];
  gallery: GalleryItem[];
  tables: DiningTable[];
  orders: OrderRecord[];
  reservations: ReservationRequest[];
}

const DEFAULT_STORE: PersistedStore = {
  adminCredentialHash: null,
  settings: {
    businessName: "Chop 'n Chill Restaurant & Lounge",
    address: 'HH3J+G5M, Kasoa, Ghana',
    phone: '+233 55 490 3755',
    whatsappNumber: '233554903755',
    googleMapsUrl: 'https://maps.app.goo.gl/kUKzbf8rbvxfX9BK6',
    openingHours: 'Schedule editable in Owner Portal — please call +233 55 490 3755 to confirm daily hours.',
    deliveryNote: 'Dine-in, takeaway, and delivery available. Delivery coverage confirmed by staff upon enquiry.',
    socials: [
      { id: 'soc-ig', label: 'Instagram (Editable URL)', url: '' },
      { id: 'soc-fb', label: 'Facebook (Editable URL)', url: '' },
      { id: 'soc-tt', label: 'TikTok (Editable URL)', url: '' },
    ],
  },
  menu: [
    {
      id: 'menu-banku-fish',
      name: 'Banku with Grilled Fish',
      category: 'Ghanaian Specialties',
      priceCedi: null,
      priceLabel: 'Price TBD (Editable)',
      description: 'Customer favourite from Google reviews. Editable ingredients and portion details.',
      isFavourite: true,
      isPlaceholderDescription: true,
      available: true,
      image: '/src/assets/images/dish_banku_grilled_fish_1795211571848.jpg',
      imageVerified: false,
    },
    {
      id: 'menu-assorted-fried-rice',
      name: 'Assorted Fried Rice',
      category: 'Rice Dishes',
      priceCedi: null,
      priceLabel: 'Price TBD (Editable)',
      description: 'Customer favourite from Google reviews. Editable description and garnish options.',
      isFavourite: true,
      isPlaceholderDescription: true,
      available: true,
      image: '/src/assets/images/dish_jollof_kebab_feast_1795211571034.jpg',
      imageVerified: false,
    },
    {
      id: 'menu-assorted-jollof',
      name: 'Assorted Jollof Rice',
      category: 'Rice Dishes',
      priceCedi: null,
      priceLabel: 'Price TBD (Editable)',
      description: 'Customer favourite from Google reviews. Editable description and protein pairings.',
      isFavourite: true,
      isPlaceholderDescription: true,
      available: true,
      image: '/src/assets/images/dish_jollof_kebab_feast_1795211571034.jpg',
      imageVerified: false,
    },
    {
      id: 'menu-chicken-kebab',
      name: 'Chicken Kebab',
      category: 'Grills & Barbecue',
      priceCedi: null,
      priceLabel: 'Price TBD (Editable)',
      description: 'Customer favourite from Google reviews. Editable marinade and skewer details.',
      isFavourite: true,
      isPlaceholderDescription: true,
      available: true,
      image: '/src/assets/images/dish_jollof_kebab_feast_1795211571034.jpg',
      imageVerified: false,
    },
    {
      id: 'menu-samosas',
      name: 'Samosas',
      category: 'Appetizers & Small Chops',
      priceCedi: null,
      priceLabel: 'Price TBD (Editable)',
      description: 'Customer favourite from Google reviews. Editable filling and portion count.',
      isFavourite: true,
      isPlaceholderDescription: true,
      available: true,
      image: '/src/assets/images/dish_jollof_kebab_feast_1795211571034.jpg',
      imageVerified: false,
    },
    {
      id: 'menu-beverages-placeholder',
      name: 'Lounge Drinks & Fresh Juices (Placeholder)',
      category: 'Drinks & Beverages',
      priceCedi: null,
      priceLabel: 'Price TBD (Editable)',
      description: 'Editable beverage slot — populate confirmed cocktails, soft drinks, and fresh juices in the Owner Portal.',
      isFavourite: false,
      isPlaceholderDescription: true,
      available: true,
      image: '/src/assets/images/about_terrace_dining_1795211571923.jpg',
      imageVerified: false,
    },
    {
      id: 'menu-chef-special-placeholder',
      name: "Chef's Platter (Editable Placeholder)",
      category: "Chef's Specials",
      priceCedi: null,
      priceLabel: 'Price TBD (Editable)',
      description: "Editable Chef's Special entry — add confirmed house specialties and GH₵ pricing in the Owner Portal.",
      isFavourite: false,
      isPlaceholderDescription: true,
      available: true,
      image: '/src/assets/images/dish_banku_grilled_fish_1795211571848.jpg',
      imageVerified: false,
    },
  ],
  events: [
    {
      id: 'evt-weekend-band',
      title: 'Weekend Live-Band Nights (Schedule Editable)',
      date: 'Upcoming Date TBD',
      startTime: 'Start Time TBD',
      performers: 'Featured Performers TBD',
      description: 'Live-band entertainment is part of the Chop \'n Chill weekend lounge experience. Management can publish verified dates, performers, and start times here.',
      promoImage: '/src/assets/images/live_band_lounge_1795211571900.jpg',
      isPlaceholder: true,
    },
    {
      id: 'evt-terrace-social',
      title: 'Upstairs Terrace Lounge Evenings (Schedule Editable)',
      date: 'Upcoming Date TBD',
      startTime: 'Start Time TBD',
      performers: 'Host / Band TBD',
      description: 'An editable upcoming-event slot for group hangouts, acoustic sets, or special celebrations at Chop \'n Chill Kasoa.',
      promoImage: '/src/assets/images/about_terrace_dining_1795211571923.jpg',
      isPlaceholder: true,
    },
  ],
  gallery: [
    {
      id: 'gal-exterior',
      title: 'Evening Exterior & Warm Lighting',
      category: 'Exterior',
      image: '/src/assets/images/hero_chop_chill_exterior_1795211571468.jpg',
      caption: 'Illustrative architectural concept — upload a verified Chop \'n Chill exterior photo in the Owner Portal.',
      isVerifiedVenuePhoto: false,
    },
    {
      id: 'gal-terrace',
      title: 'Indoor Dining & Upstairs Terrace',
      category: 'Terrace',
      image: '/src/assets/images/about_terrace_dining_1795211571923.jpg',
      caption: 'Illustrative indoor and upstairs terrace ambience — replace with verified venue photography anytime.',
      isVerifiedVenuePhoto: false,
    },
    {
      id: 'gal-banku',
      title: 'Banku with Grilled Fish',
      category: 'Grilled Fish',
      image: '/src/assets/images/dish_banku_grilled_fish_1795211571848.jpg',
      caption: 'Illustrative dish presentation of Banku with charcoal-grilled fish — upload kitchen photography in Admin.',
      isVerifiedVenuePhoto: false,
    },
    {
      id: 'gal-rice-kebab',
      title: 'Assorted Rice, Chicken Kebab & Samosas',
      category: 'Rice Dishes',
      image: '/src/assets/images/dish_jollof_kebab_feast_1795211571034.jpg',
      caption: 'Illustrative spread featuring assorted jollof, fried rice, chicken kebab, and samosas.',
      isVerifiedVenuePhoto: false,
    },
    {
      id: 'gal-liveband',
      title: 'Weekend Live-Band Lounge',
      category: 'Live Band',
      image: '/src/assets/images/live_band_lounge_1795211571900.jpg',
      caption: 'Illustrative live music lounge atmosphere — upload verified weekend performance photos in Admin.',
      isVerifiedVenuePhoto: false,
    },
    {
      id: 'gal-interior',
      title: 'Intimate Dining & Group Tables',
      category: 'Interior',
      image: '/src/assets/images/about_terrace_dining_1795211571923.jpg',
      caption: 'Illustrative table setting for romantic dates, family dining, and group gatherings.',
      isVerifiedVenuePhoto: false,
    },
  ],
  tables: [
    { id: 'T-01', name: 'Indoor Table 01', area: 'Indoor Dining', capacity: 4, status: 'Available' },
    { id: 'T-02', name: 'Indoor Booth 02', area: 'Indoor Dining', capacity: 6, status: 'Available' },
    { id: 'T-03', name: 'Courtyard Table 03', area: 'Outdoor Dining', capacity: 4, status: 'Available' },
    { id: 'T-04', name: 'Terrace Lounge 04', area: 'Upstairs Terrace', capacity: 6, status: 'Available' },
    { id: 'T-05', name: 'Terrace Group 05', area: 'Upstairs Terrace', capacity: 8, status: 'Available' },
  ],
  orders: [],
  reservations: [],
};

function ensureStore(): PersistedStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULT_STORE, null, 2), 'utf8');
    return structuredClone(DEFAULT_STORE);
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PersistedStore>;
    return {
      ...structuredClone(DEFAULT_STORE),
      ...parsed,
      settings: { ...DEFAULT_STORE.settings, ...(parsed.settings || {}) },
    };
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
}

function writeStore(store: PersistedStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmpPath, STORE_PATH);
}

function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyScryptHash(passcode: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(passcode, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function constantTimeStringMatch(a: string, b: string): boolean {
  const aHash = crypto.createHash('sha256').update(a).digest();
  const bHash = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(aHash, bHash);
}

function signSessionToken(): string {
  const payload = Buffer.from(
    JSON.stringify({
      role: 'owner',
      exp: Date.now() + 1000 * 60 * 60 * 12,
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number };
    return typeof decoded.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

function isSafeMediaUrl(url: string): boolean {
  if (!url) return true;
  if (url.startsWith('/src/assets/')) return true;
  if (/^data:image\/(png|jpeg|jpg|webp|avif);base64,[A-Za-z0-9+/=]+$/.test(url) && url.length <= 2_500_000) {
    return true;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isSafeExternalUrl(url: string): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

// Simple in-memory IP rate limiter for public submissions
const rateLimits = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, max = 15): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimits.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || !verifySessionToken(token)) {
    res.status(401).json({ error: 'Unauthorized. Please sign in to the Staff & Owner Portal.' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '3mb' }));

  // Auth status
  app.get('/api/auth/status', (req, res) => {
    const store = ensureStore();
    const envPass = (process.env.ADMIN_PASSCODE || '').trim();
    const mode = envPass ? 'env' : store.adminCredentialHash ? 'claimed' : 'unclaimed';
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    const authenticated = Boolean(token && verifySessionToken(token));
    res.json({ mode, authenticated });
  });

  // One-time first-run owner setup when ADMIN_PASSCODE env is unset and no hash saved
  app.post('/api/auth/setup', (req, res) => {
    const envPass = (process.env.ADMIN_PASSCODE || '').trim();
    if (envPass) {
      res.status(403).json({ error: 'Owner passcode is managed by environment configuration.' });
      return;
    }
    const store = ensureStore();
    if (store.adminCredentialHash) {
      res.status(409).json({ error: 'Owner passcode has already been claimed. Please sign in.' });
      return;
    }
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (passcode.length < 6 || passcode.length > 128) {
      res.status(400).json({ error: 'Passcode must be between 6 and 128 characters.' });
      return;
    }
    store.adminCredentialHash = hashPasscode(passcode);
    writeStore(store);
    res.json({ token: signSessionToken(), mode: 'claimed' });
  });

  // Staff / Owner Login
  app.post('/api/auth/login', (req, res) => {
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (!passcode) {
      res.status(400).json({ error: 'Please enter your passcode.' });
      return;
    }
    const envPass = (process.env.ADMIN_PASSCODE || '').trim();
    const store = ensureStore();

    if (envPass) {
      if (!constantTimeStringMatch(passcode, envPass)) {
        res.status(401).json({ error: 'Invalid passcode.' });
        return;
      }
      res.json({ token: signSessionToken(), mode: 'env' });
      return;
    }

    if (!store.adminCredentialHash) {
      res.status(400).json({ error: 'Owner passcode has not been claimed yet.' });
      return;
    }

    if (!verifyScryptHash(passcode, store.adminCredentialHash)) {
      res.status(401).json({ error: 'Invalid passcode.' });
      return;
    }
    res.json({ token: signSessionToken(), mode: 'claimed' });
  });

  // Public Store Data (never exposes private reservations, orders, or credentials)
  app.get('/api/public', (_req, res) => {
    const store = ensureStore();
    res.json({
      settings: store.settings,
      menu: store.menu,
      events: store.events,
      gallery: store.gallery,
      tableSummary: {
        total: store.tables.length,
        available: store.tables.filter((t) => t.status === 'Available').length,
        areas: ['Indoor Dining', 'Outdoor Dining', 'Upstairs Terrace'],
      },
    });
  });

  // Public Reservation Submission
  app.post('/api/reservations', (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: 'Too many requests. Please call +233 55 490 3755 directly.' });
      return;
    }
    const body = req.body || {};
    // Honeypot spam check
    if (typeof body.website === 'string' && body.website.trim().length > 0) {
      res.status(400).json({ error: 'Invalid submission.' });
      return;
    }
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const date = typeof body.date === 'string' ? body.date.trim() : '';
    const time = typeof body.time === 'string' ? body.time.trim() : '';
    const guests = Number(body.guests);
    const seatingPreference = typeof body.seatingPreference === 'string' ? body.seatingPreference.trim() : 'No Preference';
    const specialRequests = typeof body.specialRequests === 'string' ? body.specialRequests.trim().slice(0, 500) : '';

    if (name.length < 2 || name.length > 80) {
      res.status(400).json({ error: 'Please provide a valid customer name.' });
      return;
    }
    if (!/^[+0-9\s()-]{7,24}$/.test(phone)) {
      res.status(400).json({ error: 'Please provide a valid phone number.' });
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      res.status(400).json({ error: 'Please choose a valid preferred date and time.' });
      return;
    }
    if (!Number.isInteger(guests) || guests < 1 || guests > 50) {
      res.status(400).json({ error: 'Guest count must be between 1 and 50.' });
      return;
    }

    const allowedSeating = ['Indoor Dining', 'Outdoor Dining', 'Upstairs Terrace', 'No Preference'];
    const reservation: ReservationRequest = {
      id: `RES-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      name,
      phone,
      email,
      date,
      time,
      guests,
      seatingPreference: (allowedSeating.includes(seatingPreference) ? seatingPreference : 'No Preference') as ReservationRequest['seatingPreference'],
      specialRequests,
      status: 'Pending Staff Response',
      createdAt: new Date().toISOString(),
    };

    const store = ensureStore();
    store.reservations.unshift(reservation);
    writeStore(store);

    res.status(201).json({
      reservation: {
        id: reservation.id,
        status: reservation.status,
        date: reservation.date,
        time: reservation.time,
        guests: reservation.guests,
      },
    });
  });

  // Public Order Enquiry Submission
  app.post('/api/orders', (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(ip, 25)) {
      res.status(429).json({ error: 'Too many requests. Please call +233 55 490 3755 directly.' });
      return;
    }
    const body = req.body || {};
    const customerName = typeof body.customerName === 'string' ? body.customerName.trim().slice(0, 80) : 'Guest Enquiry';
    const customerPhone = typeof body.customerPhone === 'string' ? body.customerPhone.trim().slice(0, 24) : '';
    const serviceType = ['Dine-In', 'Takeaway', 'Delivery'].includes(body.serviceType) ? body.serviceType : 'Takeaway';
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 400) : '';
    const rawItems = Array.isArray(body.items)
      ? (body.items as Array<{ menuItemId?: string; qty?: number }>)
      : [];

    if (!rawItems.length || rawItems.length > 30) {
      res.status(400).json({ error: 'Order tray cannot be empty.' });
      return;
    }

    const store = ensureStore();
    const items: OrderLineItem[] = rawItems
      .map((item): OrderLineItem | null => {
        const found = store.menu.find((m) => m.id === item.menuItemId);
        const qty = Math.max(1, Math.min(25, Math.floor(Number(item.qty) || 1)));
        if (!found) return null;
        return {
          menuItemId: found.id,
          name: found.name,
          qty,
          unitPriceCedi: found.priceCedi,
        };
      })
      .filter((x): x is OrderLineItem => x !== null);

    if (!items.length) {
      res.status(400).json({ error: 'No valid menu items provided.' });
      return;
    }

    const allPriced = items.every((i) => typeof i.unitPriceCedi === 'number');
    const totalCedi = allPriced
      ? Number(items.reduce((sum, i) => sum + (i.unitPriceCedi || 0) * i.qty, 0).toFixed(2))
      : null;

    const order: OrderRecord = {
      id: `ORD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      customerName: customerName || 'Guest Enquiry',
      customerPhone,
      serviceType,
      notes,
      items,
      totalCedi,
      status: 'Pending',
      source: 'Web Enquiry',
      createdAt: new Date().toISOString(),
    };

    store.orders.unshift(order);
    writeStore(store);

    res.status(201).json({ order });
  });

  // Admin Full Data
  app.get('/api/admin/store', requireAdmin, (_req, res) => {
    const store = ensureStore();
    res.json({
      settings: store.settings,
      menu: store.menu,
      events: store.events,
      gallery: store.gallery,
      tables: store.tables,
      orders: store.orders,
      reservations: store.reservations,
      tableSummary: {
        total: store.tables.length,
        available: store.tables.filter((t) => t.status === 'Available').length,
        areas: ['Indoor Dining', 'Outdoor Dining', 'Upstairs Terrace'],
      },
    });
  });

  // Admin Menu CRUD
  app.post('/api/admin/menu', requireAdmin, (req, res) => {
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
    const category = MENU_CATEGORIES.includes(body.category) ? body.category : 'Ghanaian Specialties';
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 300) : 'Editable dish description.';
    const priceCedi = body.priceCedi === null || body.priceCedi === '' || body.priceCedi === undefined ? null : Number(body.priceCedi);
    const image = typeof body.image === 'string' ? body.image.trim() : '';

    if (!name) {
      res.status(400).json({ error: 'Dish name is required.' });
      return;
    }
    if (priceCedi !== null && (Number.isNaN(priceCedi) || priceCedi < 0 || priceCedi > 50000)) {
      res.status(400).json({ error: 'Invalid price in Ghana cedis.' });
      return;
    }
    if (!isSafeMediaUrl(image)) {
      res.status(400).json({ error: 'Invalid image URL or image exceeds 2.5MB.' });
      return;
    }

    const store = ensureStore();
    const newItem: MenuItem = {
      id: `menu-${crypto.randomBytes(4).toString('hex')}`,
      name,
      category,
      priceCedi,
      priceLabel: priceCedi !== null ? `GH₵ ${priceCedi.toFixed(2)}` : 'Price TBD (Editable)',
      description: description || 'Editable dish description.',
      isFavourite: Boolean(body.isFavourite),
      isPlaceholderDescription: Boolean(body.isPlaceholderDescription),
      available: body.available !== false,
      image,
      imageVerified: Boolean(body.imageVerified),
    };
    store.menu.unshift(newItem);
    writeStore(store);
    res.status(201).json({ item: newItem });
  });

  app.put('/api/admin/menu/:id', requireAdmin, (req, res) => {
    const store = ensureStore();
    const idx = store.menu.findIndex((m) => m.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Menu item not found.' });
      return;
    }
    const current = store.menu[idx];
    const body = req.body || {};
    const nextImage = typeof body.image === 'string' ? body.image.trim() : current.image;
    if (!isSafeMediaUrl(nextImage)) {
      res.status(400).json({ error: 'Invalid image URL or image exceeds 2.5MB.' });
      return;
    }

    const nextPrice =
      body.priceCedi === undefined
        ? current.priceCedi
        : body.priceCedi === null || body.priceCedi === ''
        ? null
        : Number(body.priceCedi);

    if (nextPrice !== null && (Number.isNaN(nextPrice) || nextPrice < 0 || nextPrice > 50000)) {
      res.status(400).json({ error: 'Invalid price in Ghana cedis.' });
      return;
    }

    const updated: MenuItem = {
      ...current,
      name: typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 100) : current.name,
      category: MENU_CATEGORIES.includes(body.category) ? body.category : current.category,
      priceCedi: nextPrice,
      priceLabel: nextPrice !== null ? `GH₵ ${nextPrice.toFixed(2)}` : 'Price TBD (Editable)',
      description: typeof body.description === 'string' ? body.description.trim().slice(0, 300) : current.description,
      isFavourite: typeof body.isFavourite === 'boolean' ? body.isFavourite : current.isFavourite,
      isPlaceholderDescription: typeof body.isPlaceholderDescription === 'boolean' ? body.isPlaceholderDescription : false,
      available: typeof body.available === 'boolean' ? body.available : current.available,
      image: nextImage,
      imageVerified: typeof body.imageVerified === 'boolean' ? body.imageVerified : current.imageVerified,
    };

    store.menu[idx] = updated;
    writeStore(store);
    res.json({ item: updated });
  });

  app.delete('/api/admin/menu/:id', requireAdmin, (req, res) => {
    const store = ensureStore();
    store.menu = store.menu.filter((m) => m.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  // Admin Gallery CRUD
  app.post('/api/admin/gallery', requireAdmin, (req, res) => {
    const body = req.body || {};
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 100) : '';
    const image = typeof body.image === 'string' ? body.image.trim() : '';
    if (!title || !image || !isSafeMediaUrl(image)) {
      res.status(400).json({ error: 'Title and valid photo URL/upload are required.' });
      return;
    }
    const store = ensureStore();
    const item: GalleryItem = {
      id: `gal-${crypto.randomBytes(4).toString('hex')}`,
      title,
      category: typeof body.category === 'string' ? body.category : 'Guest Experiences',
      image,
      caption: typeof body.caption === 'string' ? body.caption.trim().slice(0, 220) : '',
      isVerifiedVenuePhoto: Boolean(body.isVerifiedVenuePhoto),
    };
    store.gallery.unshift(item);
    writeStore(store);
    res.status(201).json({ item });
  });

  app.delete('/api/admin/gallery/:id', requireAdmin, (req, res) => {
    const store = ensureStore();
    store.gallery = store.gallery.filter((g) => g.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  // Admin Events CRUD
  app.post('/api/admin/events', requireAdmin, (req, res) => {
    const body = req.body || {};
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : '';
    const promoImage = typeof body.promoImage === 'string' ? body.promoImage.trim() : '';
    if (!title || !isSafeMediaUrl(promoImage)) {
      res.status(400).json({ error: 'Event title and valid image URL are required.' });
      return;
    }
    const store = ensureStore();
    const item: EventItem = {
      id: `evt-${crypto.randomBytes(4).toString('hex')}`,
      title,
      date: typeof body.date === 'string' ? body.date.trim().slice(0, 60) : 'Date TBD',
      startTime: typeof body.startTime === 'string' ? body.startTime.trim().slice(0, 40) : 'Time TBD',
      performers: typeof body.performers === 'string' ? body.performers.trim().slice(0, 100) : 'Performers TBD',
      description: typeof body.description === 'string' ? body.description.trim().slice(0, 350) : '',
      promoImage,
      isPlaceholder: Boolean(body.isPlaceholder),
    };
    store.events.unshift(item);
    writeStore(store);
    res.status(201).json({ item });
  });

  app.put('/api/admin/events/:id', requireAdmin, (req, res) => {
    const store = ensureStore();
    const idx = store.events.findIndex((e) => e.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    const body = req.body || {};
    const cur = store.events[idx];
    const promoImage = typeof body.promoImage === 'string' ? body.promoImage.trim() : cur.promoImage;
    if (!isSafeMediaUrl(promoImage)) {
      res.status(400).json({ error: 'Invalid promotional image.' });
      return;
    }
    store.events[idx] = {
      ...cur,
      title: typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 120) : cur.title,
      date: typeof body.date === 'string' ? body.date.trim().slice(0, 60) : cur.date,
      startTime: typeof body.startTime === 'string' ? body.startTime.trim().slice(0, 40) : cur.startTime,
      performers: typeof body.performers === 'string' ? body.performers.trim().slice(0, 100) : cur.performers,
      description: typeof body.description === 'string' ? body.description.trim().slice(0, 350) : cur.description,
      promoImage,
      isPlaceholder: typeof body.isPlaceholder === 'boolean' ? body.isPlaceholder : false,
    };
    writeStore(store);
    res.json({ item: store.events[idx] });
  });

  app.delete('/api/admin/events/:id', requireAdmin, (req, res) => {
    const store = ensureStore();
    store.events = store.events.filter((e) => e.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  // Admin Tables & Floor Management
  app.post('/api/admin/tables', requireAdmin, (req, res) => {
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : '';
    const area = ['Indoor Dining', 'Outdoor Dining', 'Upstairs Terrace'].includes(body.area) ? body.area : 'Indoor Dining';
    const capacity = Math.max(1, Math.min(30, Math.floor(Number(body.capacity) || 4)));
    if (!name) {
      res.status(400).json({ error: 'Table name is required.' });
      return;
    }
    const store = ensureStore();
    const table: DiningTable = {
      id: `T-${String(store.tables.length + 1).padStart(2, '0')}`,
      name,
      area,
      capacity,
      status: 'Available',
    };
    store.tables.push(table);
    writeStore(store);
    res.status(201).json({ table });
  });

  app.patch('/api/admin/tables/:id', requireAdmin, (req, res) => {
    const store = ensureStore();
    const table = store.tables.find((t) => t.id === req.params.id);
    if (!table) {
      res.status(404).json({ error: 'Table not found.' });
      return;
    }
    const status = req.body?.status;
    if (['Available', 'Occupied', 'Reserved'].includes(status)) {
      table.status = status;
      writeStore(store);
    }
    res.json({ table });
  });

  // Admin POS Walk-in / Dine-in Order Creation & Status Updates
  app.post('/api/admin/orders', requireAdmin, (req, res) => {
    const body = req.body || {};
    const rawItems = Array.isArray(body.items)
      ? (body.items as Array<{ menuItemId?: string; qty?: number }>)
      : [];
    const store = ensureStore();
    const items: OrderLineItem[] = rawItems
      .map((item): OrderLineItem | null => {
        const found = store.menu.find((m) => m.id === item.menuItemId);
        const qty = Math.max(1, Math.min(30, Math.floor(Number(item.qty) || 1)));
        if (!found) return null;
        return { menuItemId: found.id, name: found.name, qty, unitPriceCedi: found.priceCedi };
      })
      .filter((x): x is OrderLineItem => x !== null);

    if (!items.length) {
      res.status(400).json({ error: 'Select at least one menu item.' });
      return;
    }

    const allPriced = items.every((i) => typeof i.unitPriceCedi === 'number');
    const totalCedi = allPriced
      ? Number(items.reduce((sum, i) => sum + (i.unitPriceCedi || 0) * i.qty, 0).toFixed(2))
      : null;

    const order: OrderRecord = {
      id: `POS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      customerName: typeof body.customerName === 'string' && body.customerName.trim() ? body.customerName.trim().slice(0, 80) : 'Walk-In Guest',
      customerPhone: typeof body.customerPhone === 'string' ? body.customerPhone.trim().slice(0, 24) : '',
      serviceType: ['Dine-In', 'Takeaway', 'Delivery'].includes(body.serviceType) ? body.serviceType : 'Dine-In',
      tableId: typeof body.tableId === 'string' ? body.tableId : undefined,
      notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 300) : '',
      items,
      totalCedi,
      status: 'Pending',
      source: 'POS Walk-In',
      createdAt: new Date().toISOString(),
    };
    store.orders.unshift(order);
    if (order.serviceType === 'Dine-In' && order.tableId) {
      const tbl = store.tables.find((t) => t.id === order.tableId);
      if (tbl) tbl.status = 'Occupied';
    }
    writeStore(store);
    res.status(201).json({ order });
  });

  app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
    const store = ensureStore();
    const order = store.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    const allowed: OrderStatus[] = ['Pending', 'Preparing', 'Ready', 'Served', 'Completed', 'Cancelled'];
    if (allowed.includes(req.body?.status)) {
      order.status = req.body.status;
      if ((order.status === 'Completed' || order.status === 'Cancelled') && order.tableId) {
        const tbl = store.tables.find((t) => t.id === order.tableId);
        if (tbl) tbl.status = 'Available';
      }
      writeStore(store);
    }
    res.json({ order });
  });

  // Admin Reservations Status
  app.patch('/api/admin/reservations/:id', requireAdmin, (req, res) => {
    const store = ensureStore();
    const reservation = store.reservations.find((r) => r.id === req.params.id);
    if (!reservation) {
      res.status(404).json({ error: 'Reservation not found.' });
      return;
    }
    const allowed: ReservationStatus[] = ['Pending Staff Response', 'Confirmed', 'Declined'];
    if (allowed.includes(req.body?.status)) {
      reservation.status = req.body.status;
      writeStore(store);
    }
    res.json({ reservation });
  });

  // Admin Settings Update
  app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const store = ensureStore();
    const body = req.body || {};
    const nextSocials = Array.isArray(body.socials)
      ? body.socials
          .filter((s: { url?: string }) => isSafeExternalUrl(s?.url || ''))
          .slice(0, 8)
          .map((s: { id?: string; label?: string; url?: string }, idx: number) => ({
            id: typeof s.id === 'string' ? s.id : `soc-${idx}`,
            label: typeof s.label === 'string' ? s.label.trim().slice(0, 60) : 'Social Link',
            url: typeof s.url === 'string' ? s.url.trim().slice(0, 240) : '',
          }))
      : store.settings.socials;

    store.settings = {
      ...store.settings,
      address: typeof body.address === 'string' && body.address.trim() ? body.address.trim().slice(0, 140) : store.settings.address,
      phone: typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim().slice(0, 30) : store.settings.phone,
      openingHours: typeof body.openingHours === 'string' ? body.openingHours.trim().slice(0, 240) : store.settings.openingHours,
      deliveryNote: typeof body.deliveryNote === 'string' ? body.deliveryNote.trim().slice(0, 240) : store.settings.deliveryNote,
      socials: nextSocials,
    };
    writeStore(store);
    res.json({ settings: store.settings });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Chop 'n Chill server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
