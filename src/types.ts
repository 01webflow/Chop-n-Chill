export type MenuCategory =
  | 'Ghanaian Specialties'
  | 'Rice Dishes'
  | 'Grills & Barbecue'
  | 'Appetizers & Small Chops'
  | 'Drinks & Beverages'
  | "Chef's Specials";

export const MENU_CATEGORIES: MenuCategory[] = [
  'Ghanaian Specialties',
  'Rice Dishes',
  'Grills & Barbecue',
  'Appetizers & Small Chops',
  'Drinks & Beverages',
  "Chef's Specials",
];

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  priceCedi: number | null; // null indicates unconfirmed / editable placeholder
  priceLabel: string;
  description: string;
  isFavourite: boolean;
  isPlaceholderDescription: boolean;
  available: boolean;
  image: string;
  imageVerified: boolean;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  startTime: string;
  performers: string;
  description: string;
  promoImage: string;
  isPlaceholder: boolean;
}

export type GalleryCategory =
  | 'Exterior'
  | 'Interior'
  | 'Terrace'
  | 'Signature Dishes'
  | 'Grilled Fish'
  | 'Rice Dishes'
  | 'Drinks'
  | 'Live Band'
  | 'Guest Experiences';

export interface GalleryItem {
  id: string;
  title: string;
  category: GalleryCategory;
  image: string;
  caption: string;
  isVerifiedVenuePhoto: boolean;
}

export type TableArea = 'Indoor Dining' | 'Outdoor Dining' | 'Upstairs Terrace';
export type TableStatus = 'Available' | 'Occupied' | 'Reserved';

export interface DiningTable {
  id: string;
  name: string;
  area: TableArea;
  capacity: number;
  status: TableStatus;
}

export type OrderServiceType = 'Dine-In' | 'Takeaway' | 'Delivery';
export type OrderStatus = 'Pending' | 'Preparing' | 'Ready' | 'Served' | 'Completed' | 'Cancelled';

export interface OrderLineItem {
  menuItemId: string;
  name: string;
  qty: number;
  unitPriceCedi: number | null;
}

export interface OrderRecord {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceType: OrderServiceType;
  tableId?: string;
  notes?: string;
  items: OrderLineItem[];
  totalCedi: number | null;
  status: OrderStatus;
  source: 'Web Enquiry' | 'POS Walk-In';
  createdAt: string;
}

export type ReservationStatus = 'Pending' | 'Confirmed' | 'Declined' | 'Cancelled';

export interface ReservationRequest {
  id: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  guests: number;
  seatingPreference: TableArea | 'No Preference';
  specialRequests: string;
  status: ReservationStatus;
  source?: 'Web Form' | 'AI Concierge';
  createdAt: string;
}

export interface SocialLink {
  id: string;
  label: string;
  url: string;
}

export interface RestaurantSettings {
  businessName: string;
  address: string;
  phone: string;
  whatsappNumber: string;
  googleMapsUrl: string;
  openingHours: string;
  deliveryNote: string;
  socials: SocialLink[];
}

export type FaqCategory =
  | 'Reservations'
  | 'Menu & Dietary'
  | 'Location & Parking'
  | 'Lounge & Live Band';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: FaqCategory;
  isPlaceholder: boolean;
}

export type StaffRole = 'owner' | 'staff';

export interface AiConciergeConfig {
  receptionistName: string;
  personalityPrompt: string;
  customKnowledgeBase: string;
  voiceEnabled: boolean;
  retentionDays: number;
  updatedAt: string;
}

export interface AiPublicConfig {
  receptionistName: string;
  voiceEnabled: boolean;
}

export interface AiTranscriptTurn {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  toolsUsed?: string[];
}

export interface AiConversationLog {
  id: string;
  sessionId: string;
  channel: 'chat' | 'voice';
  startedAt: string;
  lastMessageAt: string;
  turns: AiTranscriptTurn[];
  escalatedToHuman: boolean;
  guestName?: string;
  guestContact?: string;
}

export interface HumanEscalationRequest {
  id: string;
  conversationId?: string;
  guestName: string;
  guestContact: string;
  reason: string;
  summary: string;
  channel: 'whatsapp' | 'phone' | 'staff-inbox';
  status: 'Open' | 'Resolved';
  createdAt: string;
}

export interface AdminAnalytics {
  totalConversations: number;
  voiceConversations: number;
  openEscalations: number;
  pendingReservations: number;
  confirmedReservations: number;
  aiCreatedReservations: number;
}

export interface PublicStorePayload {
  settings: RestaurantSettings;
  menu: MenuItem[];
  events: EventItem[];
  gallery: GalleryItem[];
  faqs: FaqItem[];
  aiPublicConfig: AiPublicConfig;
  tableSummary: {
    total: number;
    available: number;
    areas: TableArea[];
  };
}

export interface AdminStorePayload extends PublicStorePayload {
  role: StaffRole;
  staffPasscodeConfigured: boolean;
  tables: DiningTable[];
  orders: OrderRecord[];
  reservations: ReservationRequest[];
  aiConfig: AiConciergeConfig;
  conversations: AiConversationLog[];
  escalations: HumanEscalationRequest[];
  analytics: AdminAnalytics;
}

export interface AuthStatus {
  mode: 'env' | 'claimed' | 'unclaimed';
  authenticated: boolean;
  role?: StaffRole;
}
