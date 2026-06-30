import { Box, Container, Typography, Stack, Divider } from '@mui/material';

export function PublicFooter() {
  return (
    <Box component="footer" sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 8 }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
          <Typography variant="body2" color="text.secondary">
            TicketOps &mdash; built as a DevSecOps &amp; SRE showcase platform.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No double bookings. Ever. (Redis says so.)
          </Typography>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">
          &copy; {new Date().getFullYear()} TicketOps. Demo project &mdash; not a real ticketing service.
        </Typography>
      </Container>
    </Box>
  );
}
