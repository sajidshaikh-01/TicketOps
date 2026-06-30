import { Container, Typography, Button, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 12, textAlign: 'center' }}>
      <Typography variant="h1" sx={{ fontSize: '5rem', fontWeight: 700, color: 'secondary.main' }}>
        404
      </Typography>
      <Typography variant="h5" sx={{ mb: 2 }}>
        This page took a wrong turn somewhere.
      </Typography>
      <Stack direction="row" justifyContent="center">
        <Button component={RouterLink} to="/" variant="contained">
          Back to home
        </Button>
      </Stack>
    </Container>
  );
}
