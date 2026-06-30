import { Box, Container, Typography, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { tokens } from '../../theme/tokens';

export function Hero() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 8, md: 12 },
        backgroundImage: `radial-gradient(circle at 20% 20%, ${tokens.color.violet}33, transparent 50%), radial-gradient(circle at 80% 0%, ${tokens.color.amber}22, transparent 45%)`,
      }}
    >
      <Container maxWidth="md" sx={{ textAlign: 'center' }}>
        <Typography variant="overline" color="secondary.main" fontWeight={700} letterSpacing="0.15em">
          LIVE EVENTS, REAL SEATS, ZERO DOUBLE-BOOKINGS
        </Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', md: '4rem' }, mt: 1, mb: 2 }}>
          Find your seat at the next big thing
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4, fontWeight: 400 }}>
          Concerts, comedy, conferences, and match-day watch parties &mdash; pick a seat and it's locked the moment you click it.
        </Typography>
        <Stack direction="row" justifyContent="center" gap={2}>
          <Button size="large" variant="contained" onClick={() => navigate('/events')}>
            Browse events
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
