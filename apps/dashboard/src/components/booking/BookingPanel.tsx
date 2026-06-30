import { Box, Typography, Stack, Button, Divider, Chip } from '@mui/material';
import type { EventDetail, Seat } from '../../types';

interface BookingPanelProps {
  event: EventDetail;
  selectedSeats: Seat[];
  onCheckout: () => void;
  isSubmitting: boolean;
}

const CONVENIENCE_FEE_RATE = 0.05;

export function BookingPanel({ event, selectedSeats, onCheckout, isSubmitting }: BookingPanelProps) {
  const subtotal = selectedSeats.reduce((sum, seat) => sum + Number(event.basePrice) * Number(seat.priceTier), 0);
  const fee = subtotal * CONVENIENCE_FEE_RATE;
  const total = subtotal + fee;

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 3,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        position: { md: 'sticky' },
        top: { md: 96 },
      }}
    >
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        Your selection
      </Typography>

      {selectedSeats.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Tap seats on the map to add them here.
        </Typography>
      ) : (
        <Stack direction="row" gap={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          {selectedSeats.map((seat) => (
            <Chip key={seat.id} label={seat.seatCode} size="small" color="primary" />
          ))}
        </Stack>
      )}

      <Divider sx={{ my: 2 }} />

      <Stack gap={1}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Subtotal ({selectedSeats.length} seat{selectedSeats.length === 1 ? '' : 's'})
          </Typography>
          <Typography variant="body2">₹{subtotal.toFixed(2)}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Convenience fee (5%)
          </Typography>
          <Typography variant="body2">₹{fee.toFixed(2)}</Typography>
        </Stack>
        <Divider sx={{ my: 1 }} />
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="subtitle1" fontWeight={700}>
            Total
          </Typography>
          <Typography variant="subtitle1" fontWeight={700} color="secondary.main">
            ₹{total.toFixed(2)}
          </Typography>
        </Stack>
      </Stack>

      <Button
        fullWidth
        size="large"
        variant="contained"
        sx={{ mt: 3 }}
        disabled={selectedSeats.length === 0 || isSubmitting}
        onClick={onCheckout}
      >
        {isSubmitting ? 'Booking...' : 'Continue to checkout'}
      </Button>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, textAlign: 'center' }}>
        Seats are held for 10 minutes once you check out.
      </Typography>
    </Box>
  );
}
