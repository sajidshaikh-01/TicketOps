import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Typography, Button, Container } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Something went wrong
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            This part of the page hit an unexpected error. Reloading usually fixes it.
          </Typography>
          <Box>
            <Button variant="contained" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </Box>
        </Container>
      );
    }
    return this.props.children;
  }
}
