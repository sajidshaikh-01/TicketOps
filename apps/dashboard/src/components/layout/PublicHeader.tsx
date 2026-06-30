import { AppBar, Toolbar, Typography, Button, Box, IconButton, Avatar, Menu, MenuItem, Stack } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';

export function PublicHeader() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/');
  };

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar sx={{ gap: 3, py: 1 }}>
        <Stack
          direction="row"
          alignItems="center"
          gap={1}
          component={RouterLink}
          to="/"
          sx={{ textDecoration: 'none', color: 'inherit' }}
        >
          <ConfirmationNumberIcon sx={{ color: 'secondary.main' }} />
          <Typography variant="h6" fontWeight={700} letterSpacing="-0.02em">
            TicketOps
          </Typography>
        </Stack>

        <Box sx={{ flexGrow: 1 }} />

        <Button component={RouterLink} to="/events" color="inherit">
          Browse events
        </Button>

        {user ? (
          <>
            <Button component={RouterLink} to="/my-bookings" color="inherit">
              My bookings
            </Button>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                {user.fullName.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
              {(user.role === 'ADMIN' || user.role === 'ORGANIZER') && (
                <MenuItem
                  onClick={() => {
                    setAnchorEl(null);
                    navigate('/admin');
                  }}
                >
                  Admin dashboard
                </MenuItem>
              )}
              <MenuItem onClick={handleLogout}>Log out</MenuItem>
            </Menu>
          </>
        ) : (
          <Stack direction="row" gap={1}>
            <Button component={RouterLink} to="/login" color="inherit">
              Log in
            </Button>
            <Button component={RouterLink} to="/register" variant="contained" color="primary">
              Sign up
            </Button>
          </Stack>
        )}
      </Toolbar>
    </AppBar>
  );
}
