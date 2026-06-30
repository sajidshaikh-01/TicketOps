import { Container, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Hero } from '../../components/events/Hero';
import { EventGrid } from '../../components/events/EventGrid';
import { eventsService } from '../../api/events.service';

export function HomePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['events', 'home-preview'],
    queryFn: () => eventsService.list({ pageSize: 6 }),
  });

  return (
    <Box>
      <Hero />
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
          Happening soon
        </Typography>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}
        {isError && <Alert severity="error">Couldn't load events right now. Please try again shortly.</Alert>}
        {data && <EventGrid events={data.items} />}
      </Container>
    </Box>
  );
}
