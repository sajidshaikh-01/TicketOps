import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Grid,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Stack,
  Chip,
} from '@mui/material';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { eventsService } from '../../api/events.service';
import { bookingsService } from '../../api/bookings.service';
import { SeatMapView } from '../../components/booking/SeatMapView';
import { BookingPanel } from '../../components/booking/BookingPanel';
import { CheckoutDialog, type CheckoutFormValues } from '../../components/booking/CheckoutDialog';
import { useSeatSelectionStore } from '../../store/seatSelectionStore';
import { useAuthStore } from '../../store/authStore';
import type { AxiosError } from 'axios';

const MAX_SEATS = 8;

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const { setEventId, toggleSeat, selectedSeatCodes, clearSelection } = useSeatSelectionStore();

  const eventQuery = useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsService.getById(id!),
    enabled: !!id,
  });

  const seatMapQuery = useQuery({
    queryKey: ['events', id, 'seats'],
    queryFn: () => eventsService.getSeatMap(id!),
    enabled: !!id,
    refetchInterval: 15_000, // seat status can change as others book; poll lightly
  });

  useEffect(() => {
    if (id) setEventId(id);
  }, [id, setEventId]);

  const bookingMutation = useMutation({
    mutationFn: (values: CheckoutFormValues) =>
      bookingsService.create({
        eventId: id!,
        seatCodes: selectedSeatCodes,
        customerName: values.customerName,
        customerEmail: values.customerEmail,
      }),
    onSuccess: (booking) => {
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['events', id, 'seats'] });
      navigate(`/booking-confirmation/${booking.bookingRef}`);
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const message = err.response?.data?.message;
      setBookingError(Array.isArray(message) ? message.join(', ') : message ?? 'Something went wrong while booking. Please try again.');
    },
  });

  if (eventQuery.isLoading || seatMapQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (eventQuery.isError || !eventQuery.data) {
    return (
      <Container maxWidth="sm" sx={{ py: 10 }}>
        <Alert severity="error">This event couldn't be found. It may have been removed or unpublished.</Alert>
      </Container>
    );
  }

  const event = eventQuery.data;
  const seats = seatMapQuery.data?.seats ?? [];
  const selectedSeats = seats.filter((s) => selectedSeatCodes.includes(s.seatCode));

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Chip label={event.category} size="small" color="secondary" sx={{ mb: 2 }} />
      <Typography variant="h3" fontWeight={700} sx={{ mb: 1 }}>
        {event.title}
      </Typography>
      <Stack direction="row" gap={3} sx={{ mb: 1, flexWrap: 'wrap' }}>
        <Stack direction="row" alignItems="center" gap={0.5} color="text.secondary">
          <CalendarMonthOutlinedIcon fontSize="small" />
          <Typography variant="body2">
            {new Date(event.startsAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" gap={0.5} color="text.secondary">
          <LocationOnOutlinedIcon fontSize="small" />
          <Typography variant="body2">
            {event.venue}, {event.city}
          </Typography>
        </Stack>
      </Stack>
      {event.description && (
        <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 700 }}>
          {event.description}
        </Typography>
      )}

      <Grid container spacing={4} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Select your seats
          </Typography>
          {seats.length === 0 ? (
            <Alert severity="info">Seat map isn't available for this event yet.</Alert>
          ) : (
            <SeatMapView
              seats={seats}
              selectedSeatCodes={selectedSeatCodes}
              onToggleSeat={(code) => toggleSeat(code, MAX_SEATS)}
              maxSelectable={MAX_SEATS}
            />
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          <BookingPanel
            event={event}
            selectedSeats={selectedSeats}
            onCheckout={() => {
              setBookingError(null);
              setCheckoutOpen(true);
            }}
            isSubmitting={bookingMutation.isPending}
          />
        </Grid>
      </Grid>

      <CheckoutDialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onSubmit={(values) => bookingMutation.mutate(values)}
        isSubmitting={bookingMutation.isPending}
        errorMessage={bookingError}
        defaultValues={user ? { customerName: user.fullName, customerEmail: user.email } : undefined}
      />
    </Container>
  );
}
