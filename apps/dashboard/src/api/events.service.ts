import { eventsApi } from './clients';
import type { EventDetail, EventSummary, PaginatedResult, SeatMap } from '../types';

export interface ListEventsParams {
  category?: string;
  city?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const eventsService = {
  list: async (params: ListEventsParams = {}) => {
    const { data } = await eventsApi.get<PaginatedResult<EventSummary>>('/events', { params });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await eventsApi.get<EventDetail>(`/events/${id}`);
    return data;
  },

  getSeatMap: async (id: string) => {
    const { data } = await eventsApi.get<SeatMap>(`/events/${id}/seats`);
    return data;
  },

  listCategories: async () => {
    const { data } = await eventsApi.get<string[]>('/events/categories');
    return data;
  },
};
