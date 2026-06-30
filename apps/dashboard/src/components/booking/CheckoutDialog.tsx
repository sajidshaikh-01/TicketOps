import { Stack, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from '@mui/material';
import { useForm } from 'react-hook-form';

export interface CheckoutFormValues {
  customerName: string;
  customerEmail: string;
}

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CheckoutFormValues) => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
  defaultValues?: Partial<CheckoutFormValues>;
}

export function CheckoutDialog({ open, onClose, onSubmit, isSubmitting, errorMessage, defaultValues }: CheckoutDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormValues>({ defaultValues });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Confirm your details</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack gap={2.5} sx={{ mt: 1 }}>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            <TextField
              label="Full name"
              fullWidth
              {...register('customerName', { required: 'Name is required', minLength: { value: 2, message: 'Too short' } })}
              error={!!errors.customerName}
              helperText={errors.customerName?.message}
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              {...register('customerEmail', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
              })}
              error={!!errors.customerEmail}
              helperText={errors.customerEmail?.message ?? 'Your booking confirmation will be sent here'}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Confirming...' : 'Confirm booking'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
