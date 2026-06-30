import { Box, Stack, Typography, Divider } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import { tokens } from '../../theme/tokens';
import type { Booking } from '../../types';
import { BookingStatusChip } from './StatusChips';

// The signature visual of TicketOps: a real torn-ticket silhouette built
// from a radial-gradient "perforation" mask rather than a plain rounded
// card. This is the one place we spend visual boldness, used specifically
// for booking confirmations and "My Bookings" - the moment that matters most
// to a user of an event-ticketing product.
const PERFORATION_SIZE = 22;

export function TicketStub({ booking }: { booking: Booking }) {
  const seatLabel = booking.seats.map((s) => s.seat.seatCode).join(', ');

  return (
    <Box
      sx={{
        display: 'flex',
        borderRadius: `${tokens.radius.lg}px`,
        overflow: 'hidden',
        boxShadow: tokens.shadow.glow,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Main stub body */}
      <Box sx={{ flex: 1, p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="overline" color="text.secondary">
              {booking.event?.venue ?? 'Venue'} &middot; {booking.event?.city ?? ''}
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {booking.event?.title ?? 'Event'}
            </Typography>
          </Box>
          <BookingStatusChip status={booking.status} />
        </Stack>

        <Stack direction="row" gap={4} sx={{ mt: 3 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              DATE
            </Typography>
            <Typography fontWeight={600}>
              {booking.event?.startsAt ? new Date(booking.event.startsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              SEATS
            </Typography>
            <Typography fontWeight={600}>{seatLabel || '—'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              TOTAL
            </Typography>
            <Typography fontWeight={600}>₹{Number(booking.totalAmount).toFixed(2)}</Typography>
          </Box>
        </Stack>
      </Box>

      {/* Perforated divider */}
      <Box
        sx={{
          width: 0,
          borderLeft: '2px dashed',
          borderColor: 'divider',
          position: 'relative',
          my: 2,
        }}
      />

      {/* Stub tear-off section with booking ref */}
      <Box
        sx={{
          width: 140,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          py: 3,
          px: 2,
          bgcolor: 'action.hover',
          position: 'relative',
          // Perforation notches: a repeating radial-gradient cut into the
          // edge, simulating a real torn ticket stub.
          '&::before': {
            content: '""',
            position: 'absolute',
            left: -1,
            top: 0,
            bottom: 0,
            width: PERFORATION_SIZE,
            backgroundImage: `radial-gradient(circle, transparent ${PERFORATION_SIZE / 2 - 2}px, var(--mui-palette-background-paper) ${PERFORATION_SIZE / 2 - 1}px)`,
            backgroundSize: `${PERFORATION_SIZE}px ${PERFORATION_SIZE}px`,
            backgroundPosition: 'left center',
            backgroundRepeat: 'repeat-y',
          },
        }}
      >
        <ConfirmationNumberIcon sx={{ color: 'secondary.main' }} />
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          BOOKING REF
        </Typography>
        <Typography fontFamily="IBM Plex Mono, monospace" fontWeight={700} sx={{ textAlign: 'center' }}>
          {booking.bookingRef}
        </Typography>
        <Divider flexItem sx={{ width: '60%' }} />
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          {seatLabel.split(',').length} seat(s)
        </Typography>
      </Box>
    </Box>
  );
}
