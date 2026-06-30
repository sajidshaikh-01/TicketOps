import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Typography,
  Box,
  CircularProgress,
  Alert,
  Card,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  MenuItem,
  Button,
  Stack,
  Pagination,
} from '@mui/material';
import { adminBookingsService } from '../../api/admin.service';
import { BookingStatusChip } from '../../components/shared/StatusChips';
import type { BookingStatus } from '../../types';

const STATUS_OPTIONS: BookingStatus[] = ['PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED'];

export function AdminBookingsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'bookings', { status, page }],
    queryFn: () => adminBookingsService.list({ status: status || undefined, page, pageSize: 15 }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => adminBookingsService.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] }),
  });

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Bookings
      </Typography>

      <TextField
        select
        label="Filter by status"
        size="small"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value as BookingStatus | '');
          setPage(1);
        }}
        sx={{ minWidth: 200, mb: 3 }}
      >
        <MenuItem value="">All statuses</MenuItem>
        {STATUS_OPTIONS.map((s) => (
          <MenuItem key={s} value={s}>
            {s}
          </MenuItem>
        ))}
      </TextField>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {isError && <Alert severity="error">Couldn't load bookings right now.</Alert>}
      {data && data.items.length === 0 && <Alert severity="info">No bookings match this filter.</Alert>}

      {data && data.items.length > 0 && (
        <Card>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Reference</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Seats</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((booking) => (
                <TableRow key={booking.id} hover>
                  <TableCell sx={{ fontFamily: 'IBM Plex Mono, monospace' }}>{booking.bookingRef}</TableCell>
                  <TableCell>{booking.event?.title ?? '—'}</TableCell>
                  <TableCell>
                    {booking.customerName}
                    <Typography variant="caption" color="text.secondary" display="block">
                      {booking.customerEmail}
                    </Typography>
                  </TableCell>
                  <TableCell>{booking.seats.map((s) => s.seat.seatCode).join(', ')}</TableCell>
                  <TableCell>₹{Number(booking.totalAmount).toFixed(2)}</TableCell>
                  <TableCell>
                    <BookingStatusChip status={booking.status} />
                  </TableCell>
                  <TableCell align="right">
                    {booking.status !== 'CANCELLED' && (
                      <Button
                        size="small"
                        color="error"
                        disabled={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(booking.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {data && data.totalPages > 1 && (
        <Stack direction="row" justifyContent="center" sx={{ mt: 3 }}>
          <Pagination count={data.totalPages} page={page} onChange={(_, value) => setPage(value)} color="primary" />
        </Stack>
      )}
    </Box>
  );
}
