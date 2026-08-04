// Must match the JSON shape events-api pushes in
// events-api/src/bookings/bookings.service.ts (BOOKINGS_QUEUE_KEY).
export interface BookingQueueMessage {
  jobId: string;
  bookingId: string;
  bookingRef: string;
  eventTitle: string;
  customerName: string;
  customerEmail: string;
  seatCodes: string[];
  requestId?: string;
  traceContext?: Record<string, string>;
}
