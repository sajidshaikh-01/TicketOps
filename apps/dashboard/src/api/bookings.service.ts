import { eventsApi } from './clients';
import type { Booking } from '../types';

export interface CreateBookingPayload {
  eventId: string;
  seatCodes: string[];
  customerName: string;
  customerEmail: string;
}

export const bookingsService = {
  create: async (payload: CreateBookingPayload) => {
    const { data } = await eventsApi.post<Booking>('/bookings', payload);
    return data;
  },

  getByRef: async (ref: string) => {
    const { data } = await eventsApi.get<Booking>(`/bookings/${ref}`);
    return data;
  },

  getMyBookings: async () => {
    const { data } = await eventsApi.get<Booking[]>('/bookings/me');
    return data;
  },

  cancel: async (ref: string) => {
    const { data } = await eventsApi.post<{ message: string }>(`/bookings/${ref}/cancel`);
    return data;
  },
};
