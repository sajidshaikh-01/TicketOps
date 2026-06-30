import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container, Typography, Box, CircularProgress, Alert, Stack, Button } from '@mui/material';
import { bookingsService } from '../../api/bookings.service';
import { TicketStub } from '../../components/shared/TicketStub';

export function MyBookingsPage() {
  const queryClient = useQueryClient();

  const { data: bookings, isLoading, isError } = useQuery({
    queryKey: ['bookings', 'me'],
    queryFn: bookingsService.getMyBookings,
  });

  const cancelMutation = useMutation({
    mutationFn: (ref: string) => bookingsService.cancel(ref),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings', 'me'] }),
  });

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h3" fontWeight={700} sx={{ mb: 1 }}>
        My bookings
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Everything you've booked, in one place.
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {isError && <Alert severity="error">Couldn't load your bookings right now. Please try again shortly.</Alert>}

      {bookings && bookings.length === 0 && (
        <Alert severity="info">You haven't booked anything yet &mdash; browse events to get started.</Alert>
      )}

      <Stack gap={3}>
        {bookings?.map((booking) => (
          <Box key={booking.id}>
            <TicketStub booking={booking} />
            {booking.status !== 'CANCELLED' && (
              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
                <Button
                  size="small"
                  color="error"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate(booking.bookingRef)}
                >
                  Cancel booking
                </Button>
              </Stack>
            )}
          </Box>
        ))}
      </Stack>
    </Container>
  );
}
