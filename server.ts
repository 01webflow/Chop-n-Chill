import crypto from 'crypto';
import dotenv from 'dotenv';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import type { LiveServerMessage } from '@google/genai';
import { Modality } from '@google/genai';
import { WebSocketServer } from 'ws';
import {
  buildConciergeSystemInstruction,
  CONCIERGE_TOOL_DECLARATIONS,
  createGeminiClient,
  executeConciergeTool,
  runConciergeChatTurn,
  sanitizeTranscriptText,
} from './server/aiConcierge.ts';
import type {
  AiConciergeConfig,
  AiConversationLog,
  DiningTable,
  EventItem,
  FaqCategory,
  FaqItem,
  GalleryItem,
  HumanEscalationRequest,
  MenuCategory,
  MenuItem,
  OrderLineItem,
  OrderRecord,
  OrderStatus,
  ReservationRequest,
  ReservationStatus,
  RestaurantSettings,
  StaffRole,
} from './src/types.ts';

dotenv.config();

const MENU_CATEGORIES: MenuCategory[] = [
  'Ghanaian Specialties',
  'Rice Dishes',
  'Grills & Barbecue',
  'Appetizers & Small Chops',
  'Drinks & Beverages',
  "Chef's Specials",
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, 'data');
const STORE_PATH = path.resolve(DATA_DIR, 'store.json');

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

interface PersistedStore {
  adminCredentialHash: string | null;
  staffCredentialHash: string | null;
  settings: RestaurantSettings;
  aiConfig: AiConciergeConfig;
  menu: MenuItem[];
  events: EventItem[];
  gallery: GalleryItem[];
  faqs: FaqItem[];
  tables: DiningTable[];
  orders: OrderRecord[];
  reservations: ReservationRequest[];
  conversations: AiConversationLog[];
  escalations: HumanEscalationRequest[];
}

const DEFAULT_AI_CONFIG: AiConciergeConfig = {
  receptionistName: 'AI Concierge',
  personalityPrompt:
    "Warm, polished, attentive Ghanaian hospitality host for Chop 'n Chill Restaurant & Lounge in Kasoa. Conversational, concise, welcoming, and always honest about editable placeholders or pending reservations.",
  customKnowledgeBase:
    'Highlight our indoor dining room, outdoor courtyard, and breezy upstairs terrace. Remind guests that weekend live-band schedules and GH₵ menu prices marked TBD are confirmed directly by management or on WhatsApp (+233 55 490 3755).',
  voiceEnabled: true,
  retentionDays: 14,
  updatedAt: new Date().toISOString(),
};

const DEFAULT_STORE: PersistedStore = {
  adminCredentialHash: null,
  staffCredentialHash: null,
  aiConfig: DEFAULT_AI_CONFIG,
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
      description: "Live-band entertainment is part of the Chop 'n Chill weekend lounge experience. Management can publish verified dates, performers, and start times here.",
      promoImage: '/src/assets/images/live_band_lounge_1795211571900.jpg',
      isPlaceholder: true,
    },
    {
      id: 'evt-terrace-social',
      title: 'Upstairs Terrace Lounge Evenings (Schedule Editable)',
      date: 'Upcoming Date TBD',
      startTime: 'Start Time TBD',
      performers: 'Host / Band TBD',
      description: "An editable upcoming-event slot for group hangouts, acoustic sets, or special celebrations at Chop 'n Chill Kasoa.",
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
      caption: "Illustrative architectural concept — upload a verified Chop 'n Chill exterior photo in the Owner Portal.",
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
  faqs: [
    {
      id: 'faq-parking',
      category: 'Location & Parking',
      question: "Is parking available at Chop 'n Chill in Kasoa?",
      answer:
        "Please call +233 55 490 3755 or message us on WhatsApp prior to your visit to confirm current parking access near HH3J+G5M, Kasoa—especially during peak weekend live-band evenings. Management can publish exact parking details in the Owner Portal.",
      isPlaceholder: true,
    },
    {
      id: 'faq-directions',
      category: 'Location & Parking',
      question: "Where is Chop 'n Chill located and what are your opening hours?",
      answer:
        'We are located at HH3J+G5M, Kasoa, Ghana (linked directly on Google Maps). Current opening hours are editable by management—please call +233 55 490 3755 to confirm daily hours before visiting.',
      isPlaceholder: true,
    },
    {
      id: 'faq-deposits',
      category: 'Reservations',
      question: 'Do you require a deposit for table reservations or group bookings?',
      answer:
        "Submitting a reservation request on our website does not charge any payment or deposit upfront, and your booking is only confirmed once Chop 'n Chill staff respond. Any deposit requirement for large groups or reserved terrace tables is confirmed directly by our host team.",
      isPlaceholder: true,
    },
    {
      id: 'faq-dietary',
      category: 'Menu & Dietary',
      question: 'Can you accommodate dietary preferences or food allergies?',
      answer:
        'Please share allergies, spice levels, or dietary requests in the Special Requests field when reserving or ordering, and verify ingredients directly with our kitchen staff at +233 55 490 3755 before ordering.',
      isPlaceholder: true,
    },
    {
      id: 'faq-services',
      category: 'Menu & Dietary',
      question: 'Do you offer takeaway and delivery in Kasoa?',
      answer:
        'Yes — Dine-in, Takeaway, and Delivery are available. Use our Order Enquiry Tray or call +233 55 490 3755 to confirm dish pricing in GH₵ and delivery coverage for your area.',
      isPlaceholder: false,
    },
    {
      id: 'faq-spaces',
      category: 'Lounge & Live Band',
      question: 'What seating options and live entertainment are available?',
      answer:
        "Chop 'n Chill Restaurant & Lounge offers indoor dining, outdoor dining, and an upstairs terrace, plus weekend live-band entertainment suited for romantic dates, family dining, and group hangouts.",
      isPlaceholder: false,
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
  conversations: [],
  escalations: [],
};

let memoryStoreFallback: PersistedStore | null = null;

function normalizeFaqCategory(cat: string): FaqCategory {
  if (cat === 'Visit & Parking' || cat === 'Location & Parking') return 'Location & Parking';
  if (cat === 'Reservations & Deposits' || cat === 'Reservations') return 'Reservations';
  if (cat === 'Dietary & Kitchen' || cat === 'Menu & Dietary') return 'Menu & Dietary';
  return 'Lounge & Live Band';
}

function normalizeReservationStatus(status: string): ReservationStatus {
  if (status === 'Confirmed') return 'Confirmed';
  if (status === 'Declined') return 'Declined';
  if (status === 'Cancelled') return 'Cancelled';
  return 'Pending';
}

function pruneExpiredConversations(store: PersistedStore): void {
  const days = Math.max(1, Math.min(90, store.aiConfig.retentionDays || 14));
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  store.conversations = store.conversations
    .filter((c) => {
      const ts = Date.parse(c.lastMessageAt || c.startedAt);
      return Number.isNaN(ts) || ts >= cutoff;
    })
    .slice(0, 120);
}

function ensureStore(): PersistedStore {
  if (memoryStoreFallback) {
    pruneExpiredConversations(memoryStoreFallback);
    return memoryStoreFallback;
  }
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULT_STORE, null, 2), 'utf8');
      return structuredClone(DEFAULT_STORE);
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PersistedStore>;
    const rawFaqs = Array.isArray(parsed.faqs) && parsed.faqs.length > 0 ? parsed.faqs : DEFAULT_STORE.faqs;
    const rawReservations = Array.isArray(parsed.reservations) ? parsed.reservations : [];
    const hydrated: PersistedStore = {
      ...structuredClone(DEFAULT_STORE),
      ...parsed,
      aiConfig: { ...DEFAULT_AI_CONFIG, ...(parsed.aiConfig || {}) },
      faqs: rawFaqs.map((f) => ({ ...f, category: normalizeFaqCategory(String(f.category)) })),
      reservations: rawReservations.map((r) => ({
        ...r,
        status: normalizeReservationStatus(String(r.status)),
      })),
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
      escalations: Array.isArray(parsed.escalations) ? parsed.escalations : [],
      settings: { ...DEFAULT_STORE.settings, ...(parsed.settings || {}) },
    };
    pruneExpiredConversations(hydrated);
    return hydrated;
  } catch {
    memoryStoreFallback = structuredClone(DEFAULT_STORE);
    return memoryStoreFallback;
  }
}

function writeStore(store: PersistedStore): void {
  pruneExpiredConversations(store);
  memoryStoreFallback = store;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpPath = `${STORE_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf8');
    fs.renameSync(tmpPath, STORE_PATH);
  } catch {
    // Keep memoryStoreFallback active if container filesystem is read-only
  }
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

function signSessionToken(role: StaffRole): string {
  const payload = Buffer.from(
    JSON.stringify({
      role,
      exp: Date.now() + 1000 * 60 * 60 * 12,
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): StaffRole | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      exp?: number;
      role?: StaffRole;
    };
    if (typeof decoded.exp !== 'number' || decoded.exp <= Date.now()) return null;
    return decoded.role === 'staff' ? 'staff' : 'owner';
  } catch {
    return null;
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

// Per-IP rate limiter
const rateLimits = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, bucket: string, max = 15, windowMs = 15 * 60 * 1000): boolean {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

interface AuthenticatedRequest extends Request {
  staffRole?: StaffRole;
}

function requireStaffOrOwner(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const role = token ? verifySessionToken(token) : null;
  if (!role) {
    res.status(401).json({ error: 'Unauthorized. Please sign in to the Staff & Owner Portal.' });
    return;
  }
  req.staffRole = role;
  next();
}

function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const role = token ? verifySessionToken(token) : null;
  if (!role) {
    res.status(401).json({ error: 'Unauthorized. Please sign in.' });
    return;
  }
  if (role !== 'owner') {
    res.status(403).json({ error: 'Owner privileges are required for this configuration change.' });
    return;
  }
  req.staffRole = role;
  next();
}

function recordConversationTurn(
  store: PersistedStore,
  sessionId: string,
  channel: 'chat' | 'voice',
  role: 'user' | 'assistant',
  text: string,
  toolsUsed?: string[]
): void {
  const cleanText = sanitizeTranscriptText(text).slice(0, 1500);
  if (!cleanText) return;
  const now = new Date().toISOString();
  let conv = store.conversations.find((c) => c.sessionId === sessionId && c.channel === channel);
  if (!conv) {
    conv = {
      id: `CONV-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      sessionId,
      channel,
      startedAt: now,
      lastMessageAt: now,
      turns: [],
      escalatedToHuman: false,
    };
    store.conversations.unshift(conv);
  }
  conv.lastMessageAt = now;
  conv.turns.push({
    role,
    text: cleanText,
    timestamp: now,
    toolsUsed: toolsUsed && toolsUsed.length > 0 ? toolsUsed : undefined,
  });
  if (conv.turns.length > 40) {
    conv.turns = conv.turns.slice(-40);
  }
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  app.use(express.json({ limit: '3mb' }));

  // Auth status
  app.get('/api/auth/status', (req, res) => {
    const store = ensureStore();
    const envPass = (process.env.ADMIN_PASSCODE || '').trim();
    const mode = envPass ? 'env' : store.adminCredentialHash ? 'claimed' : 'unclaimed';
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    const role = token ? verifySessionToken(token) : null;
    res.json({ mode, authenticated: Boolean(role), role: role || undefined });
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
    res.json({ token: signSessionToken('owner'), mode: 'claimed', role: 'owner' });
  });

  // Staff / Owner Login with RBAC
  app.post('/api/auth/login', (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(ip, 'login', 20, 15 * 60 * 1000)) {
      res.status(429).json({ error: 'Too many sign-in attempts. Please wait a few minutes.' });
      return;
    }
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (!passcode) {
      res.status(400).json({ error: 'Please enter your passcode.' });
      return;
    }
    const envPass = (process.env.ADMIN_PASSCODE || '').trim();
    const store = ensureStore();

    if (envPass) {
      if (constantTimeStringMatch(passcode, envPass)) {
        res.json({ token: signSessionToken('owner'), mode: 'env', role: 'owner' });
        return;
      }
      if (store.staffCredentialHash && verifyScryptHash(passcode, store.staffCredentialHash)) {
        res.json({ token: signSessionToken('staff'), mode: 'env', role: 'staff' });
        return;
      }
      res.status(401).json({ error: 'Invalid passcode.' });
      return;
    }

    if (!store.adminCredentialHash) {
      res.status(400).json({ error: 'Owner passcode has not been claimed yet.' });
      return;
    }

    if (verifyScryptHash(passcode, store.adminCredentialHash)) {
      res.json({ token: signSessionToken('owner'), mode: 'claimed', role: 'owner' });
      return;
    }

    if (store.staffCredentialHash && verifyScryptHash(passcode, store.staffCredentialHash)) {
      res.json({ token: signSessionToken('staff'), mode: 'claimed', role: 'staff' });
      return;
    }

    res.status(401).json({ error: 'Invalid passcode.' });
  });

  // Public Store Data (never exposes private reservations, orders, transcripts, or credentials)
  app.get('/api/public', (_req, res) => {
    const store = ensureStore();
    res.json({
      settings: store.settings,
      menu: store.menu,
      events: store.events,
      gallery: store.gallery,
      faqs: store.faqs,
      aiPublicConfig: {
        receptionistName: store.aiConfig.receptionistName,
        voiceEnabled: store.aiConfig.voiceEnabled,
      },
      tableSummary: {
        total: store.tables.length,
        available: store.tables.filter((t) => t.status === 'Available').length,
        areas: ['Indoor Dining', 'Outdoor Dining', 'Upstairs Terrace'],
      },
    });
  });

  // Autonomous AI Concierge Chat Endpoint (Server-Side Gemini + 9 Tools)
  app.post('/api/ai/chat', async (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(ip, 'ai-chat', 40, 10 * 60 * 1000)) {
      res.status(429).json({
        error: 'Rate limit reached for AI Concierge. Please call +233 55 490 3755 or use WhatsApp.',
      });
      return;
    }

    const body = req.body || {};
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1200) : '';
    const sessionId =
      typeof body.sessionId === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(body.sessionId)
        ? body.sessionId
        : `web-${crypto.randomBytes(6).toString('hex')}`;
    const rawHistory = Array.isArray(body.history) ? body.history : [];
    const history = rawHistory
      .filter(
        (h: { role?: unknown; text?: unknown }) =>
          (h?.role === 'user' || h?.role === 'assistant') && typeof h?.text === 'string'
      )
      .slice(-14)
      .map((h: { role: 'user' | 'assistant'; text: string }) => ({
        role: h.role,
        text: h.text.slice(0, 1200),
      }));

    if (!message) {
      res.status(400).json({ error: 'Please enter a message.' });
      return;
    }

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      res.status(503).json({
        error:
          'AI Concierge is temporarily unavailable because GEMINI_API_KEY is not configured on the server. Use WhatsApp or call +233 55 490 3755 directly.',
      });
      return;
    }

    const store = ensureStore();
    try {
      const result = await runConciergeChatTurn({
        apiKey,
        store,
        history,
        userMessage: message,
        sessionId,
        onWriteStore: () => writeStore(store),
      });

      recordConversationTurn(store, sessionId, 'chat', 'user', message);
      recordConversationTurn(store, sessionId, 'chat', 'assistant', result.reply, result.toolsUsed);
      writeStore(store);

      res.json({
        sessionId,
        reply: result.reply,
        toolsUsed: result.toolsUsed,
        whatsappUrl: result.whatsappUrl,
        escalationId: result.escalationId,
        reservationId: result.reservationId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI service error.';
      console.error('[AI Chat Error]', {
        message: msg,
        hasGeminiBaseUrl: Boolean(process.env.GOOGLE_GEMINI_BASE_URL),
        useVertexAi: process.env.GOOGLE_GENAI_USE_VERTEXAI || 'false',
      });
      res.status(502).json({
        error: `AI Concierge encountered an error (${msg}). Please call +233 55 490 3755 or send a WhatsApp enquiry.`,
      });
    }
  });

  // Explicit Guest-Triggered Human Handoff Endpoint (also works if AI/Voice fails)
  app.post('/api/ai/handoff', (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(ip, 'handoff', 15, 15 * 60 * 1000)) {
      res.status(429).json({ error: 'Too many requests. Please call +233 55 490 3755 directly.' });
      return;
    }
    const body = req.body || {};
    const store = ensureStore();
    const guestName =
      typeof body.guestName === 'string' && body.guestName.trim()
        ? sanitizeTranscriptText(body.guestName).slice(0, 80)
        : 'Website Visitor';
    const guestContact =
      typeof body.guestContact === 'string'
        ? sanitizeTranscriptText(body.guestContact).slice(0, 60)
        : 'Not provided';
    const reason =
      typeof body.reason === 'string' && body.reason.trim()
        ? sanitizeTranscriptText(body.reason).slice(0, 160)
        : 'Guest requested human staff support';
    const summary =
      typeof body.summary === 'string' && body.summary.trim()
        ? sanitizeTranscriptText(body.summary).slice(0, 800)
        : 'Guest clicked Request Human Support in AI Concierge.';
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.slice(0, 64) : undefined;

    const escalation: HumanEscalationRequest = {
      id: `ESC-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      conversationId: sessionId,
      guestName,
      guestContact,
      reason,
      summary,
      channel: 'staff-inbox',
      status: 'Open',
      createdAt: new Date().toISOString(),
    };
    store.escalations.unshift(escalation);
    if (sessionId) {
      const conv = store.conversations.find((c) => c.sessionId === sessionId);
      if (conv) conv.escalatedToHuman = true;
    }
    writeStore(store);

    const waText = `Staff Assistance Request (${escalation.id})\nGuest: ${guestName}\nContact: ${guestContact}\nReason: ${reason}\nSummary: ${summary}`;
    res.status(201).json({
      escalation,
      directPhone: store.settings.phone,
      whatsappUrl: `https://wa.me/${store.settings.whatsappNumber}?text=${encodeURIComponent(waText)}`,
    });
  });

  // Public Reservation Submission
  app.post('/api/reservations', (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(ip, 'reservations', 15)) {
      res.status(429).json({ error: 'Too many requests. Please call +233 55 490 3755 directly.' });
      return;
    }
    const body = req.body || {};
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
      status: 'Pending',
      source: 'Web Form',
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
    if (!checkRateLimit(ip, 'orders', 25)) {
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

  // Admin Full Data (Staff & Owner)
  app.get('/api/admin/store', requireStaffOrOwner, (req: AuthenticatedRequest, res) => {
    const store = ensureStore();
    const role: StaffRole = req.staffRole || 'staff';
    res.json({
      role,
      staffPasscodeConfigured: Boolean(store.staffCredentialHash),
      settings: store.settings,
      menu: store.menu,
      events: store.events,
      gallery: store.gallery,
      faqs: store.faqs,
      tables: store.tables,
      orders: store.orders,
      reservations: store.reservations,
      aiPublicConfig: {
        receptionistName: store.aiConfig.receptionistName,
        voiceEnabled: store.aiConfig.voiceEnabled,
      },
      aiConfig: store.aiConfig,
      conversations: store.conversations,
      escalations: store.escalations,
      analytics: {
        totalConversations: store.conversations.length,
        voiceConversations: store.conversations.filter((c) => c.channel === 'voice').length,
        openEscalations: store.escalations.filter((e) => e.status === 'Open').length,
        pendingReservations: store.reservations.filter((r) => r.status === 'Pending').length,
        confirmedReservations: store.reservations.filter((r) => r.status === 'Confirmed').length,
        aiCreatedReservations: store.reservations.filter((r) => r.source === 'AI Concierge').length,
      },
      tableSummary: {
        total: store.tables.length,
        available: store.tables.filter((t) => t.status === 'Available').length,
        areas: ['Indoor Dining', 'Outdoor Dining', 'Upstairs Terrace'],
      },
    });
  });

  // Owner-Only AI Configuration (Knowledge Base, Personality, Voice Toggle, Retention)
  app.put('/api/admin/ai-config', requireOwner, (req, res) => {
    const store = ensureStore();
    const body = req.body || {};
    const receptionistName =
      typeof body.receptionistName === 'string' && body.receptionistName.trim()
        ? body.receptionistName.trim().slice(0, 48)
        : store.aiConfig.receptionistName;
    const personalityPrompt =
      typeof body.personalityPrompt === 'string' && body.personalityPrompt.trim()
        ? body.personalityPrompt.trim().slice(0, 800)
        : store.aiConfig.personalityPrompt;
    const customKnowledgeBase =
      typeof body.customKnowledgeBase === 'string'
        ? body.customKnowledgeBase.trim().slice(0, 3000)
        : store.aiConfig.customKnowledgeBase;
    const voiceEnabled =
      typeof body.voiceEnabled === 'boolean' ? body.voiceEnabled : store.aiConfig.voiceEnabled;
    const retentionDays =
      typeof body.retentionDays === 'number' && Number.isFinite(body.retentionDays)
        ? Math.max(1, Math.min(90, Math.floor(body.retentionDays)))
        : store.aiConfig.retentionDays;

    store.aiConfig = {
      receptionistName,
      personalityPrompt,
      customKnowledgeBase,
      voiceEnabled,
      retentionDays,
      updatedAt: new Date().toISOString(),
    };
    writeStore(store);
    res.json({ aiConfig: store.aiConfig });
  });

  // Owner-Only Staff Passcode Management (RBAC)
  app.put('/api/admin/staff-passcode', requireOwner, (req, res) => {
    const store = ensureStore();
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (!passcode) {
      store.staffCredentialHash = null;
      writeStore(store);
      res.json({ ok: true, staffPasscodeConfigured: false });
      return;
    }
    if (passcode.length < 6 || passcode.length > 128) {
      res.status(400).json({ error: 'Staff passcode must be between 6 and 128 characters.' });
      return;
    }
    store.staffCredentialHash = hashPasscode(passcode);
    writeStore(store);
    res.json({ ok: true, staffPasscodeConfigured: true });
  });

  // Staff/Owner Escalation Status Update
  app.patch('/api/admin/escalations/:id', requireStaffOrOwner, (req, res) => {
    const store = ensureStore();
    const item = store.escalations.find((e) => e.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Escalation not found.' });
      return;
    }
    if (req.body?.status === 'Open' || req.body?.status === 'Resolved') {
      item.status = req.body.status;
      writeStore(store);
    }
    res.json({ escalation: item });
  });

  // Owner-Only Privacy Controls: Delete Individual or All Stored Conversation Transcripts
  app.delete('/api/admin/conversations/:id', requireOwner, (req, res) => {
    const store = ensureStore();
    store.conversations = store.conversations.filter((c) => c.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  app.delete('/api/admin/conversations', requireOwner, (_req, res) => {
    const store = ensureStore();
    store.conversations = [];
    writeStore(store);
    res.json({ ok: true });
  });

  // Admin Menu CRUD
  app.post('/api/admin/menu', requireStaffOrOwner, (req, res) => {
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

  app.put('/api/admin/menu/:id', requireStaffOrOwner, (req, res) => {
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

  app.delete('/api/admin/menu/:id', requireStaffOrOwner, (req, res) => {
    const store = ensureStore();
    store.menu = store.menu.filter((m) => m.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  // Admin Gallery CRUD
  app.post('/api/admin/gallery', requireStaffOrOwner, (req, res) => {
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

  app.delete('/api/admin/gallery/:id', requireStaffOrOwner, (req, res) => {
    const store = ensureStore();
    store.gallery = store.gallery.filter((g) => g.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  // Admin Events CRUD
  app.post('/api/admin/events', requireStaffOrOwner, (req, res) => {
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

  app.put('/api/admin/events/:id', requireStaffOrOwner, (req, res) => {
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

  app.delete('/api/admin/events/:id', requireStaffOrOwner, (req, res) => {
    const store = ensureStore();
    store.events = store.events.filter((e) => e.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  // Admin Tables & Floor Management
  app.post('/api/admin/tables', requireStaffOrOwner, (req, res) => {
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

  app.patch('/api/admin/tables/:id', requireStaffOrOwner, (req, res) => {
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
  app.post('/api/admin/orders', requireStaffOrOwner, (req, res) => {
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

  app.patch('/api/admin/orders/:id', requireStaffOrOwner, (req, res) => {
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

  // Admin Reservations Status (Pending, Confirmed, Declined, Cancelled)
  app.patch('/api/admin/reservations/:id', requireStaffOrOwner, (req, res) => {
    const store = ensureStore();
    const reservation = store.reservations.find((r) => r.id === req.params.id);
    if (!reservation) {
      res.status(404).json({ error: 'Reservation not found.' });
      return;
    }
    const allowed: ReservationStatus[] = ['Pending', 'Confirmed', 'Declined', 'Cancelled'];
    if (allowed.includes(req.body?.status)) {
      reservation.status = req.body.status;
      writeStore(store);
    }
    res.json({ reservation });
  });

  // Admin Settings Update (Owner only)
  app.put('/api/admin/settings', requireOwner, (req, res) => {
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

  // Admin FAQ CRUD
  app.post('/api/admin/faqs', requireStaffOrOwner, (req, res) => {
    const body = req.body || {};
    const question = typeof body.question === 'string' ? body.question.trim().slice(0, 180) : '';
    const answer = typeof body.answer === 'string' ? body.answer.trim().slice(0, 600) : '';
    const allowedCats: FaqCategory[] = [
      'Reservations',
      'Menu & Dietary',
      'Location & Parking',
      'Lounge & Live Band',
    ];
    const category: FaqCategory = allowedCats.includes(body.category)
      ? body.category
      : 'Location & Parking';
    if (!question || !answer) {
      res.status(400).json({ error: 'Question and answer are required.' });
      return;
    }
    const store = ensureStore();
    const faq: FaqItem = {
      id: `faq-${crypto.randomBytes(4).toString('hex')}`,
      question,
      answer,
      category,
      isPlaceholder: Boolean(body.isPlaceholder),
    };
    store.faqs.push(faq);
    writeStore(store);
    res.status(201).json({ faq });
  });

  app.put('/api/admin/faqs/:id', requireStaffOrOwner, (req, res) => {
    const store = ensureStore();
    const idx = store.faqs.findIndex((f) => f.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'FAQ item not found.' });
      return;
    }
    const body = req.body || {};
    const cur = store.faqs[idx];
    store.faqs[idx] = {
      ...cur,
      question: typeof body.question === 'string' && body.question.trim() ? body.question.trim().slice(0, 180) : cur.question,
      answer: typeof body.answer === 'string' && body.answer.trim() ? body.answer.trim().slice(0, 600) : cur.answer,
      isPlaceholder: typeof body.isPlaceholder === 'boolean' ? body.isPlaceholder : false,
    };
    writeStore(store);
    res.json({ faq: store.faqs[idx] });
  });

  app.delete('/api/admin/faqs/:id', requireStaffOrOwner, (req, res) => {
    const store = ensureStore();
    store.faqs = store.faqs.filter((f) => f.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  // Real-Time Gemini Live Voice WebSocket Bridge (/ws/ai-live)
  const wss = new WebSocketServer({ server, path: '/ws/ai-live' });
  wss.on('connection', async (clientWs, req) => {
    const ip = req.socket.remoteAddress || 'unknown';
    const store = ensureStore();

    if (!store.aiConfig.voiceEnabled) {
      clientWs.send(
        JSON.stringify({
          code: 'VOICE_DISABLED',
          error: 'Voice concierge is currently disabled by Chop n Chill management. Please use text chat.',
        })
      );
      clientWs.close();
      return;
    }

    if (!checkRateLimit(ip, 'ai-voice', 20, 15 * 60 * 1000)) {
      clientWs.send(
        JSON.stringify({
          code: 'RATE_LIMITED',
          error: 'Voice session rate limit reached. Please use text chat or call +233 55 490 3755.',
        })
      );
      clientWs.close();
      return;
    }

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      clientWs.send(
        JSON.stringify({
          code: 'MISSING_API_KEY',
          error:
            'Real-time voice requires GEMINI_API_KEY configured on the server. Please call +233 55 490 3755 or message on WhatsApp.',
        })
      );
      clientWs.close();
      return;
    }

    const sessionId = `voice-${crypto.randomBytes(5).toString('hex')}`;
    const liveModel = 'gemini-3.8-live';
    const ai = createGeminiClient(apiKey, 0);
    let closed = false;
    let userTranscriptBuffer = '';
    let modelTranscriptBuffer = '';
    let liveSessionRef: Awaited<ReturnType<typeof ai.live.connect>> | null = null;

    const formatLiveError = (rawMessage: string): { code: string; message: string } => {
      if (/401|403|API_KEY_INVALID|PERMISSION_DENIED/i.test(rawMessage)) {
        return {
          code: 'AUTH_ERROR',
          message: 'Server Gemini API key rejected for Live Voice. Verify GEMINI_API_KEY in Settings > Secrets.',
        };
      }
      if (/404|NOT_FOUND|not found|unsupported model/i.test(rawMessage)) {
        return {
          code: 'INVALID_MODEL',
          message: `Live model (${liveModel}) was rejected by the upstream endpoint.`,
        };
      }
      if (/429|RESOURCE_EXHAUSTED|quota/i.test(rawMessage)) {
        return {
          code: 'QUOTA_EXCEEDED',
          message: 'Live voice API quota reached temporarily. Please use text chat or try again shortly.',
        };
      }
      return {
        code: 'LIVE_SESSION_ERROR',
        message: rawMessage || 'Unable to establish live voice session.',
      };
    };

    try {
      const liveSession = await ai.live.connect({
        model: liveModel,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: false,
              prefixPaddingMs: 120,
              silenceDurationMs: 650,
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: CONCIERGE_TOOL_DECLARATIONS }],
          systemInstruction: buildConciergeSystemInstruction(store),
        },
        callbacks: {
          onmessage: async (message: LiveServerMessage) => {
            if (closed || clientWs.readyState !== 1) return;
            const sc = message.serverContent;

            if (sc?.inputTranscription?.text) {
              userTranscriptBuffer += sc.inputTranscription.text;
              clientWs.send(JSON.stringify({ inputTranscript: sc.inputTranscription.text }));
            }

            if (sc?.outputTranscription?.text) {
              modelTranscriptBuffer += sc.outputTranscription.text;
              clientWs.send(JSON.stringify({ outputTranscript: sc.outputTranscription.text }));
            }

            for (const part of sc?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
            }

            if (sc?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }

            if (sc?.turnComplete) {
              const curStore = ensureStore();
              if (userTranscriptBuffer.trim()) {
                recordConversationTurn(curStore, sessionId, 'voice', 'user', userTranscriptBuffer);
                userTranscriptBuffer = '';
              }
              if (modelTranscriptBuffer.trim()) {
                recordConversationTurn(curStore, sessionId, 'voice', 'assistant', modelTranscriptBuffer);
                modelTranscriptBuffer = '';
              }
              writeStore(curStore);
              clientWs.send(JSON.stringify({ turnComplete: true }));
            }

            if (message.toolCall?.functionCalls?.length) {
              const curStore = ensureStore();
              const responses = [];
              for (const call of message.toolCall.functionCalls) {
                const toolName = call.name || '';
                clientWs.send(JSON.stringify({ toolActive: toolName }));
                const result = await executeConciergeTool(
                  toolName,
                  (call.args || {}) as Record<string, unknown>,
                  curStore,
                  { sessionId },
                  () => writeStore(curStore)
                );
                responses.push({
                  id: call.id,
                  name: toolName,
                  response: result,
                });
              }
              liveSession.sendToolResponse({ functionResponses: responses });
            }
          },
          onerror: (err) => {
            if (!closed && clientWs.readyState === 1) {
              const formatted = formatLiveError(err?.message || 'Live voice connection interrupted.');
              clientWs.send(JSON.stringify({ code: formatted.code, error: formatted.message }));
            }
          },
          onclose: () => {
            if (!closed && clientWs.readyState === 1) {
              clientWs.send(JSON.stringify({ closed: true }));
              clientWs.close();
            }
          },
        },
      });

      liveSessionRef = liveSession;

      if (clientWs.readyState === 1) {
        clientWs.send(
          JSON.stringify({
            ready: true,
            sessionId,
            model: liveModel,
            vadMode: 'automatic',
          })
        );
      }

      clientWs.on('message', (raw) => {
        if (closed || !liveSessionRef) return;
        try {
          const msg = JSON.parse(raw.toString()) as {
            audio?: string;
            mimeType?: string;
            audioStreamEnd?: boolean;
            activityStart?: boolean;
            activityEnd?: boolean;
            text?: string;
          };
          if (typeof msg.audio === 'string' && msg.audio.length > 0) {
            liveSessionRef.sendRealtimeInput({
              audio: {
                data: msg.audio,
                mimeType: msg.mimeType || 'audio/pcm;rate=16000',
              },
            });
          } else if (msg.audioStreamEnd === true) {
            liveSessionRef.sendRealtimeInput({ audioStreamEnd: true });
          } else if (msg.activityStart === true) {
            liveSessionRef.sendRealtimeInput({ activityStart: {} });
          } else if (msg.activityEnd === true) {
            liveSessionRef.sendRealtimeInput({ activityEnd: {} });
          } else if (typeof msg.text === 'string' && msg.text.trim()) {
            liveSessionRef.sendRealtimeInput({ text: msg.text.trim().slice(0, 600) });
          }
        } catch {
          // Ignore malformed frame
        }
      });

      clientWs.on('close', () => {
        closed = true;
        try {
          const curStore = ensureStore();
          if (userTranscriptBuffer.trim()) {
            recordConversationTurn(curStore, sessionId, 'voice', 'user', userTranscriptBuffer);
          }
          if (modelTranscriptBuffer.trim()) {
            recordConversationTurn(curStore, sessionId, 'voice', 'assistant', modelTranscriptBuffer);
          }
          writeStore(curStore);
        } catch {
          // ignore
        }
        try {
          liveSession.close();
        } catch {
          // ignore
        }
      });
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : 'Unable to establish live voice session.';
      const formatted = formatLiveError(rawMsg);
      console.error('[AI Live WS Error]', {
        code: formatted.code,
        message: rawMsg,
        hasGeminiBaseUrl: Boolean(process.env.GOOGLE_GEMINI_BASE_URL),
        geminiBaseUrlHost: process.env.GOOGLE_GEMINI_BASE_URL
          ? (() => {
              try {
                return new URL(process.env.GOOGLE_GEMINI_BASE_URL).origin;
              } catch {
                return 'invalid-url';
              }
            })()
          : 'default',
        apiVersion: process.env.GOOGLE_GENAI_API_VERSION || 'default',
        useVertexAi: process.env.GOOGLE_GENAI_USE_VERTEXAI || 'false',
      });
      if (clientWs.readyState === 1) {
        clientWs.send(JSON.stringify({ code: formatted.code, error: formatted.message }));
        clientWs.close();
      }
    }
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
  server.listen(port, '0.0.0.0', () => {
    console.log(`Chop 'n Chill server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
