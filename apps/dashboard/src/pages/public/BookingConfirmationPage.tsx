import { useParams, Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Container, Typography, Box, CircularProgress, Alert, Button, Stack } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { bookingsService } from '../../api/bookings.service';
import { TicketStub } from '../../components/shared/TicketStub';

export function BookingConfirmationPage() {
  const { ref } = useParams<{ ref: string }>();

  const { data: booking, isLoading, isError } = useQuery({
    queryKey: ['bookings', ref],
    queryFn: () => bookingsService.getByRef(ref!),
    enabled: !!ref,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !booking) {
    return (
      <Container maxWidth="sm" sx={{ py: 10 }}>
        <Alert severity="error">We couldn't find that booking. Double check the reference and try again.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack alignItems="center" sx={{ mb: 4 }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 56, color: 'success.main', mb: 1 }} />
        <Typography variant="h4" fontWeight={700}>
          Booking confirmed
        </Typography>
        <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
          A confirmation has been queued for {booking.customerEmail}. Keep your booking reference handy.
        </Typography>
      </Stack>

      <TicketStub booking={booking} />

      <Stack direction="row" justifyContent="center" gap={2} sx={{ mt: 4 }}>
        <Button component={RouterLink} to="/events" variant="outlined">
          Browse more events
        </Button>
        <Button component={RouterLink} to="/my-bookings" variant="contained">
          View my bookings
        </Button>
      </Stack>
    </Container>
  );
}
