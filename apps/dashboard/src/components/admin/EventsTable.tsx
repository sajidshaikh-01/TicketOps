import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import type { AdminEvent } from '../../api/admin.service';

interface EventsTableProps {
  events: AdminEvent[];
  onEdit: (event: AdminEvent) => void;
  onDelete: (event: AdminEvent) => void;
  onTogglePublish: (event: AdminEvent) => void;
}

export function EventsTable({ events, onEdit, onDelete, onTogglePublish }: EventsTableProps) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Event</TableCell>
          <TableCell>Category</TableCell>
          <TableCell>Date</TableCell>
          <TableCell>Seats</TableCell>
          <TableCell>Bookings</TableCell>
          <TableCell>Status</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.id} hover>
            <TableCell>{event.title}</TableCell>
            <TableCell>{event.category}</TableCell>
            <TableCell>{new Date(event.startsAt).toLocaleDateString()}</TableCell>
            <TableCell>{event._count?.seats ?? event.totalSeats}</TableCell>
            <TableCell>{event._count?.bookings ?? 0}</TableCell>
            <TableCell>
              <Chip
                size="small"
                label={event.isPublished ? 'Published' : 'Draft'}
                color={event.isPublished ? 'success' : 'default'}
                variant="outlined"
              />
            </TableCell>
            <TableCell align="right">
              <Stack direction="row" justifyContent="flex-end">
                <Tooltip title={event.isPublished ? 'Unpublish' : 'Publish'}>
                  <IconButton size="small" onClick={() => onTogglePublish(event)}>
                    {event.isPublished ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => onEdit(event)}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={() => onDelete(event)}>
                    <DeleteOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
