import { Grid, Typography, Box } from '@mui/material';
import type { EventSummary } from '../../types';
import { EventCard } from './EventCard';

export function EventGrid({ events }: { events: EventSummary[] }) {
  if (events.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No events match your filters yet.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Try clearing a filter or checking back soon &mdash; new events are added regularly.
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {events.map((event) => (
        <Grid item xs={12} sm={6} md={4} key={event.id}>
          <EventCard event={event} />
        </Grid>
      ))}
    </Grid>
  );
}
