import { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  Grid,
  Typography,
  IconButton,
  Divider,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import type { AdminEvent, CreateEventPayload } from '../../api/admin.service';

interface EventFormValues {
  title: string;
  description: string;
  category: string;
  venue: string;
  city: string;
  startsAt: string;
  endsAt: string;
  basePrice: number;
  sections: { name: string; rows: number; seatsPerRow: number; priceTier: number }[];
}

interface EventFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CreateEventPayload) => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
  editingEvent?: AdminEvent | null;
}

const DEFAULT_SECTIONS = [{ name: 'GENERAL', rows: 5, seatsPerRow: 10, priceTier: 1 }];

// Converts an ISO datetime string into the value <input type="datetime-local">
// expects (no timezone, minute precision).
function toLocalInputValue(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function EventFormDialog({ open, onClose, onSubmit, isSubmitting, errorMessage, editingEvent }: EventFormDialogProps) {
  const isEditing = !!editingEvent;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EventFormValues>({
    defaultValues: {
      title: '',
      description: '',
      category: '',
      venue: '',
      city: '',
      startsAt: '',
      endsAt: '',
      basePrice: 0,
      sections: DEFAULT_SECTIONS,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'sections' });

  useEffect(() => {
    if (editingEvent) {
      reset({
        title: editingEvent.title,
        description: editingEvent.description ?? '',
        category: editingEvent.category,
        venue: editingEvent.venue,
        city: editingEvent.city,
        startsAt: toLocalInputValue(editingEvent.startsAt),
        endsAt: toLocalInputValue(editingEvent.endsAt),
        basePrice: Number(editingEvent.basePrice),
        sections: DEFAULT_SECTIONS, // seat sections aren't editable after creation
      });
    } else if (open) {
      reset({
        title: '',
        description: '',
        category: '',
        venue: '',
        city: '',
        startsAt: '',
        endsAt: '',
        basePrice: 0,
        sections: DEFAULT_SECTIONS,
      });
    }
  }, [editingEvent, open, reset]);

  const submitHandler = (values: EventFormValues) => {
    onSubmit({
      title: values.title,
      description: values.description || undefined,
      category: values.category,
      venue: values.venue,
      city: values.city,
      startsAt: new Date(values.startsAt).toISOString(),
      endsAt: new Date(values.endsAt).toISOString(),
      basePrice: Number(values.basePrice),
      sections: values.sections.map((s) => ({
        name: s.name,
        rows: Number(s.rows),
        seatsPerRow: Number(s.seatsPerRow),
        priceTier: Number(s.priceTier),
      })),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEditing ? 'Edit event' : 'Create a new event'}</DialogTitle>
      <form onSubmit={handleSubmit(submitHandler)}>
        <DialogContent>
          <Stack gap={2.5} sx={{ mt: 1 }}>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

            <TextField
              label="Event title"
              fullWidth
              {...register('title', { required: 'Title is required' })}
              error={!!errors.title}
              helperText={errors.title?.message}
            />
            <TextField label="Description" fullWidth multiline minRows={2} {...register('description')} />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Category"
                  fullWidth
                  {...register('category', { required: 'Category is required' })}
                  error={!!errors.category}
                  helperText={errors.category?.message}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Base price (₹)"
                  type="number"
                  fullWidth
                  {...register('basePrice', { required: 'Base price is required', min: { value: 0, message: 'Must be positive' } })}
                  error={!!errors.basePrice}
                  helperText={errors.basePrice?.message}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Venue"
                  fullWidth
                  {...register('venue', { required: 'Venue is required' })}
                  error={!!errors.venue}
                  helperText={errors.venue?.message}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="City"
                  fullWidth
                  {...register('city', { required: 'City is required' })}
                  error={!!errors.city}
                  helperText={errors.city?.message}
                />
              </Grid>
              <Grid item xs={6}>
                <Controller
                  name="startsAt"
                  control={control}
                  rules={{ required: 'Start time is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Starts at"
                      type="datetime-local"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.startsAt}
                      helperText={errors.startsAt?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6}>
                <Controller
                  name="endsAt"
                  control={control}
                  rules={{ required: 'End time is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Ends at"
                      type="datetime-local"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.endsAt}
                      helperText={errors.endsAt?.message}
                    />
                  )}
                />
              </Grid>
            </Grid>

            {!isEditing && (
              <>
                <Divider />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" fontWeight={700}>
                    Seat sections
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => append({ name: '', rows: 1, seatsPerRow: 10, priceTier: 1 })}
                  >
                    Add section
                  </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  The full seat map is generated once, at creation time, from these sections.
                </Typography>

                {fields.map((field, index) => (
                  <Grid container spacing={1.5} key={field.id} alignItems="center">
                    <Grid item xs={3}>
                      <TextField
                        label="Section name"
                        size="small"
                        fullWidth
                        {...register(`sections.${index}.name`, { required: true })}
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <TextField
                        label="Rows"
                        type="number"
                        size="small"
                        fullWidth
                        {...register(`sections.${index}.rows`, { required: true, min: 1 })}
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <TextField
                        label="Seats / row"
                        type="number"
                        size="small"
                        fullWidth
                        {...register(`sections.${index}.seatsPerRow`, { required: true, min: 1 })}
                      />
                    </Grid>
                    <Grid item xs={2}>
                      <TextField
                        label="Price x"
                        type="number"
                        size="small"
                        fullWidth
                        {...register(`sections.${index}.priceTier`, { required: true, min: 0.1 })}
                      />
                    </Grid>
                    <Grid item xs={1}>
                      <IconButton size="small" onClick={() => remove(index)} disabled={fields.length === 1}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Grid>
                  </Grid>
                ))}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Save changes' : 'Create event'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
