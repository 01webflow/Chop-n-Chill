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

export type ReservationStatus = 'Pending Staff Response' | 'Confirmed' | 'Declined';

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

export interface PublicStorePayload {
  settings: RestaurantSettings;
  menu: MenuItem[];
  events: EventItem[];
  gallery: GalleryItem[];
  tableSummary: {
    total: number;
    available: number;
    areas: TableArea[];
  };
}

export interface AdminStorePayload extends PublicStorePayload {
  tables: DiningTable[];
  orders: OrderRecord[];
  reservations: ReservationRequest[];
}

export interface AuthStatus {
  mode: 'env' | 'claimed' | 'unclaimed';
  authenticated: boolean;
}
