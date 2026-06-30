import { RouterProvider } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { router } from './routes/router';
import { publicTheme } from './theme/publicTheme';
import { useSessionRestore } from './hooks/useSessionRestore';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

// A single theme provider wraps the whole router. Admin pages opt into the
// light admin theme locally (see AdminLayout) by nesting their own
// ThemeProvider, since MUI themes compose - the public dark theme remains
// the app-wide default everywhere else.
export default function App() {
  useSessionRestore();

  return (
    <ThemeProvider theme={publicTheme}>
      <CssBaseline />
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
