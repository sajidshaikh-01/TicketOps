export type Role = 'ADMIN' | 'ORGANIZER' | 'CUSTOMER';
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive?: boolean;
}

export interface EventSummary {
  id: string;
  title: string;
  description: string | null;
  category: string;
  venue: string;
  city: string;
  startsAt: string;
  endsAt: string;
  bannerUrl: string | null;
  basePrice: string; // Prisma Decimal is serialized as a string over JSON
  totalSeats: number;
}

export interface EventDetail extends EventSummary {
  availability: {
    available: number;
    held: number;
    booked: number;
  };
}

export interface Seat {
  id: string;
  seatCode: string;
  section: string;
  priceTier: string;
  status: SeatStatus;
}

export interface SeatMap {
  eventId: string;
  seats: Seat[];
}

export interface BookingSeatView {
  seat: { seatCode: string; section: string };
}

export interface Booking {
  id: string;
  bookingRef: string;
  eventId: string;
  customerName: string;
  customerEmail: string;
  totalAmount: string;
  status: BookingStatus;
  qrCodeUrl: string | null;
  createdAt: string;
  seats: BookingSeatView[];
  event?: { title: string; venue: string; city: string; startsAt: string; bannerUrl?: string | null };
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DashboardStats {
  totalEvents: number;
  totalTicketsSold: number;
  totalRevenue: string;
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    failed: number;
  };
}
