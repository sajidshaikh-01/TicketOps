import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { adminEventsService, type AdminEvent, type CreateEventPayload } from '../../api/admin.service';
import { EventsTable } from '../../components/admin/EventsTable';
import { EventFormDialog } from '../../components/admin/EventFormDialog';
import type { AxiosError } from 'axios';

export function AdminEventsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminEvent | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: events, isLoading, isError } = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: adminEventsService.list,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });

  const createMutation = useMutation({
    mutationFn: (payload: CreateEventPayload) => adminEventsService.create(payload),
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const message = err.response?.data?.message;
      setFormError(Array.isArray(message) ? message.join(', ') : message ?? 'Could not create event');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateEventPayload> }) =>
      adminEventsService.update(id, payload),
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
      setEditingEvent(null);
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const message = err.response?.data?.message;
      setFormError(Array.isArray(message) ? message.join(', ') : message ?? 'Could not update event');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminEventsService.remove(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: (event: AdminEvent) =>
      event.isPublished ? adminEventsService.unpublish(event.id) : adminEventsService.publish(event.id),
    onSuccess: invalidate,
  });

  const handleSubmit = (payload: CreateEventPayload) => {
    setFormError(null);
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Events
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingEvent(null);
            setFormError(null);
            setFormOpen(true);
          }}
        >
          New event
        </Button>
      </Stack>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {isError && <Alert severity="error">Couldn't load events right now.</Alert>}
      {events && events.length === 0 && <Alert severity="info">No events yet. Create your first one to get started.</Alert>}
      {events && events.length > 0 && (
        <Card>
          <EventsTable
            events={events}
            onEdit={(event) => {
              setEditingEvent(event);
              setFormError(null);
              setFormOpen(true);
            }}
            onDelete={(event) => setDeleteTarget(event)}
            onTogglePublish={(event) => togglePublishMutation.mutate(event)}
          />
        </Card>
      )}

      <EventFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        errorMessage={formError}
        editingEvent={editingEvent}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete "{deleteTarget?.title}"?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            This can't be undone. Events with active bookings can't be deleted &mdash; unpublish instead if you just want to
            hide it.
          </Typography>
          {deleteMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {(deleteMutation.error as AxiosError<{ message?: string }>).response?.data?.message ?? 'Could not delete event'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
