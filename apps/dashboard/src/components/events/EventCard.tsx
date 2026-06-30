import { Card, CardContent, CardActionArea, Typography, Stack, Chip, Box } from '@mui/material';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { useNavigate } from 'react-router-dom';
import type { EventSummary } from '../../types';
import { tokens } from '../../theme/tokens';

export function EventCard({ event }: { event: EventSummary }) {
  const navigate = useNavigate();
  const startsAt = new Date(event.startsAt);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={() => navigate(`/events/${event.id}`)} sx={{ flexGrow: 1, alignItems: 'stretch' }}>
        <Box
          sx={{
            height: 140,
            backgroundImage: event.bannerUrl
              ? `url(${event.bannerUrl})`
              : `linear-gradient(135deg, ${tokens.color.violet}, ${tokens.color.violetDark})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        >
          <Chip
            label={event.category}
            size="small"
            sx={{ position: 'absolute', top: 12, left: 12, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', fontWeight: 600 }}
          />
        </Box>
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
            {event.title}
          </Typography>
          <Stack direction="row" alignItems="center" gap={0.5} color="text.secondary">
            <CalendarMonthOutlinedIcon fontSize="small" />
            <Typography variant="body2">
              {startsAt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={0.5} color="text.secondary">
            <LocationOnOutlinedIcon fontSize="small" />
            <Typography variant="body2">
              {event.venue}, {event.city}
            </Typography>
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="subtitle1" fontWeight={700} color="secondary.main">
            From ₹{Number(event.basePrice).toFixed(0)}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
