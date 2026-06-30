import { Chip, type ChipProps } from '@mui/material';
import type { BookingStatus, SeatStatus } from '../../types';

const BOOKING_STATUS_CONFIG: Record<BookingStatus, { label: string; color: ChipProps['color'] }> = {
  PENDING: { label: 'Pending', color: 'warning' },
  CONFIRMED: { label: 'Confirmed', color: 'success' },
  CANCELLED: { label: 'Cancelled', color: 'default' },
  FAILED: { label: 'Failed', color: 'error' },
};

const SEAT_STATUS_CONFIG: Record<SeatStatus, { label: string; color: ChipProps['color'] }> = {
  AVAILABLE: { label: 'Available', color: 'success' },
  HELD: { label: 'Held', color: 'warning' },
  BOOKED: { label: 'Booked', color: 'default' },
};

export function BookingStatusChip({ status }: { status: BookingStatus }) {
  const config = BOOKING_STATUS_CONFIG[status];
  return <Chip size="small" label={config.label} color={config.color} variant="outlined" />;
}

export function SeatStatusChip({ status }: { status: SeatStatus }) {
  const config = SEAT_STATUS_CONFIG[status];
  return <Chip size="small" label={config.label} color={config.color} variant="outlined" />;
}
