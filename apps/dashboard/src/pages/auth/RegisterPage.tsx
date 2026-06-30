import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  Link,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '../../store/authStore';
import type { AxiosError } from 'axios';

interface RegisterFormValues {
  fullName: string;
  email: string;
  password: string;
  role: 'CUSTOMER' | 'ORGANIZER';
}

export function RegisterPage() {
  const register_ = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterFormValues>({ defaultValues: { role: 'CUSTOMER' } });

  const onSubmit = async (values: RegisterFormValues) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await register_(values);
      navigate('/', { replace: true });
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string | string[] }>;
      const message = axiosErr.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message ?? 'Could not create your account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 10 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
        Create your account
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Book tickets, or set up to host your own events.
      </Typography>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Stack gap={2.5}>
          {error && <Alert severity="error">{error}</Alert>}

          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <ToggleButtonGroup
                exclusive
                fullWidth
                value={field.value}
                onChange={(_, value) => value && field.onChange(value)}
              >
                <ToggleButton value="CUSTOMER">I'm here to attend events</ToggleButton>
                <ToggleButton value="ORGANIZER">I'm hosting events</ToggleButton>
              </ToggleButtonGroup>
            )}
          />

          <TextField
            label="Full name"
            fullWidth
            {...register('fullName', { required: 'Name is required', minLength: { value: 2, message: 'Too short' } })}
            error={!!errors.fullName}
            helperText={errors.fullName?.message}
          />
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
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'At least 8 characters' },
            })}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Sign up'}
          </Button>
        </Stack>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
        Already have an account?{' '}
        <Link component={RouterLink} to="/login">
          Log in
        </Link>
      </Typography>
    </Container>
  );
}
