import { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { Container, Box, TextField, Button, Typography, Alert, Stack, Link } from '@mui/material';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../../store/authStore';
import type { AxiosError } from 'axios';

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>();

  const onSubmit = async (values: LoginFormValues) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(values.email, values.password);
      const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message ?? 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 10 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
        Welcome back
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Log in to manage your bookings.
      </Typography>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Stack gap={2.5}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Email"
            type="email"
            fullWidth
            {...register('email', { required: 'Email is required' })}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            {...register('password', { required: 'Password is required' })}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </Button>
        </Stack>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
        Don't have an account?{' '}
        <Link component={RouterLink} to="/register">
          Sign up
        </Link>
      </Typography>
    </Container>
  );
}
