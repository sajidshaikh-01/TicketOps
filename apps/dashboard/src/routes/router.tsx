import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { PublicLayout } from '../components/layout/PublicLayout';
import { ProtectedRoute } from '../components/shared/ProtectedRoute';
import { HomePage } from '../pages/public/HomePage';
import { EventsBrowsePage } from '../pages/public/EventsBrowsePage';
import { EventDetailPage } from '../pages/public/EventDetailPage';
import { BookingConfirmationPage } from '../pages/public/BookingConfirmationPage';
import { MyBookingsPage } from '../pages/public/MyBookingsPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { NotFoundPage } from '../pages/NotFoundPage';

// The admin back office (layout + all three admin pages) is code-split into
// its own chunk. A typical visitor browsing/booking events never touches
// this code, so there's no reason to ship it in the main bundle.
const AdminLayout = lazy(() => import('../components/layout/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminDashboardPage = lazy(() =>
  import('../pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const AdminEventsPage = lazy(() => import('../pages/admin/AdminEventsPage').then((m) => ({ default: m.AdminEventsPage })));
const AdminBookingsPage = lazy(() =>
  import('../pages/admin/AdminBookingsPage').then((m) => ({ default: m.AdminBookingsPage })),
);

const adminFallback = (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
    <CircularProgress />
  </Box>
);

function withAdminSuspense(element: JSX.Element) {
  return <Suspense fallback={adminFallback}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/events', element: <EventsBrowsePage /> },
      { path: '/events/:id', element: <EventDetailPage /> },
      { path: '/booking-confirmation/:ref', element: <BookingConfirmationPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      {
        element: <ProtectedRoute />,
        children: [{ path: '/my-bookings', element: <MyBookingsPage /> }],
      },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZER']} />,
    children: [
      {
        element: withAdminSuspense(<AdminLayout />),
        children: [
          { path: '', element: withAdminSuspense(<AdminDashboardPage />) },
          { path: 'events', element: withAdminSuspense(<AdminEventsPage />) },
          { path: 'bookings', element: withAdminSuspense(<AdminBookingsPage />) },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
