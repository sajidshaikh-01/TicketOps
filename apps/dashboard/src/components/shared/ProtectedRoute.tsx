import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuthStore } from '../../store/authStore';
import type { Role } from '../../types';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  redirectTo?: string;
}

export function ProtectedRoute({ allowedRoles, redirectTo = '/login' }: ProtectedRouteProps) {
  const user = useAuthStore((s) => s.user);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const location = useLocation();

  if (isInitializing) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
