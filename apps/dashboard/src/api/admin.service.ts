import { adminApi } from './clients';
import type { Booking, BookingStatus, DashboardStats, PaginatedResult } from '../types';

export interface AdminEvent {
  id: string;
  title: string;
  description: string | null;
  category: string;
  venue: string;
  city: string;
  startsAt: string;
  endsAt: string;
  bannerUrl: string | null;
  basePrice: string;
  totalSeats: number;
  isPublished: boolean;
  organizerId: string;
  _count?: { seats: number; bookings: number };
}

export interface SeatSectionInput {
  name: string;
  rows: number;
  seatsPerRow: number;
  priceTier: number;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  category: string;
  venue: string;
  city: string;
  startsAt: string;
  endsAt: string;
  bannerUrl?: string;
  basePrice: number;
  sections: SeatSectionInput[];
}

export const adminEventsService = {
  list: async () => {
    const { data } = await adminApi.get<AdminEvent[]>('/events');
    return data;
  },
  getById: async (id: string) => {
    const { data } = await adminApi.get<AdminEvent>(`/events/${id}`);
    return data;
  },
  create: async (payload: CreateEventPayload) => {
    const { data } = await adminApi.post<AdminEvent>('/events', payload);
    return data;
  },
  update: async (id: string, payload: Partial<CreateEventPayload> & { isPublished?: boolean }) => {
    const { data } = await adminApi.patch<AdminEvent>(`/events/${id}`, payload);
    return data;
  },
  remove: async (id: string) => {
    await adminApi.delete(`/events/${id}`);
  },
  publish: async (id: string) => {
    const { data } = await adminApi.post<AdminEvent>(`/events/${id}/publish`);
    return data;
  },
  unpublish: async (id: string) => {
    const { data } = await adminApi.post<AdminEvent>(`/events/${id}/unpublish`);
    return data;
  },
};

export const adminBookingsService = {
  getDashboard: async () => {
    const { data } = await adminApi.get<DashboardStats>('/dashboard');
    return data;
  },
  list: async (params: { status?: BookingStatus; eventId?: string; page?: number; pageSize?: number } = {}) => {
    const { data } = await adminApi.get<PaginatedResult<Booking>>('/bookings', { params });
    return data;
  },
  getById: async (id: string) => {
    const { data } = await adminApi.get<Booking>(`/bookings/${id}`);
    return data;
  },
  cancel: async (id: string) => {
    const { data } = await adminApi.post<{ message: string }>(`/bookings/${id}/cancel`);
    return data;
  },
};
