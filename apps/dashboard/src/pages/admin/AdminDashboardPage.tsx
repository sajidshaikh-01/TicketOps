import { useQuery } from '@tanstack/react-query';
import { Typography, Grid, Box, CircularProgress, Alert, Card, CardContent, Stack, LinearProgress } from '@mui/material';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import { adminBookingsService } from '../../api/admin.service';
import { MetricCard } from '../../components/admin/MetricCard';

export function AdminDashboardPage() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminBookingsService.getDashboard,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !stats) {
    return <Alert severity="error">Couldn't load dashboard stats right now.</Alert>;
  }

  const statusRows: { label: string; value: number; color: string }[] = [
    { label: 'Confirmed', value: stats.bookings.confirmed, color: '#0F9D72' },
    { label: 'Pending', value: stats.bookings.pending, color: '#E89A38' },
    { label: 'Cancelled', value: stats.bookings.cancelled, color: '#9C98AD' },
    { label: 'Failed', value: stats.bookings.failed, color: '#D6483F' },
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard label="Total events" value={stats.totalEvents} icon={<EventOutlinedIcon />} accentColor="#6C5CE7" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Tickets sold"
            value={stats.totalTicketsSold}
            icon={<ConfirmationNumberOutlinedIcon />}
            accentColor="#16C79A"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Revenue (confirmed)"
            value={`₹${Number(stats.totalRevenue).toFixed(0)}`}
            icon={<PaymentsOutlinedIcon />}
            accentColor="#E89A38"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Pending bookings"
            value={stats.bookings.pending}
            icon={<PendingActionsOutlinedIcon />}
            accentColor="#D6483F"
          />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Booking breakdown
          </Typography>
          <Stack gap={2}>
            {statusRows.map((row) => (
              <Box key={row.label}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="body2">{row.label}</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {row.value}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={stats.bookings.total > 0 ? (row.value / stats.bookings.total) * 100 : 0}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': { bgcolor: row.color, borderRadius: 4 },
                  }}
                />
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
