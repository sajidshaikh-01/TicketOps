import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Typography, AppBar, Toolbar, Stack, Avatar, Button } from '@mui/material';
import { ThemeProvider, CssBaseline } from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { adminTheme } from '../../theme/adminTheme';

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/admin', icon: <DashboardOutlinedIcon /> },
  { label: 'Events', to: '/admin/events', icon: <EventOutlinedIcon /> },
  { label: 'Bookings', to: '/admin/bookings', icon: <ConfirmationNumberOutlinedIcon /> },
];

export function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          <Toolbar sx={{ px: 3 }}>
            <Typography variant="h6" fontWeight={700}>
              TicketOps
            </Typography>
          </Toolbar>
          <List sx={{ px: 1 }}>
            {NAV_ITEMS.map((item) => (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                end={item.to === '/admin'}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  '&.active': { bgcolor: 'primary.main', color: '#fff', '& .MuiListItemIcon-root': { color: '#fff' } },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ p: 2 }}>
            <Button fullWidth variant="outlined" startIcon={<OpenInNewIcon />} onClick={() => navigate('/')}>
              View public site
            </Button>
          </Box>
        </Drawer>

        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <AppBar position="sticky" sx={{ left: DRAWER_WIDTH, width: `calc(100% - ${DRAWER_WIDTH}px)` }}>
            <Toolbar sx={{ justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {user?.role === 'ADMIN' ? 'Admin console' : 'Organizer console'}
              </Typography>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>{user?.fullName.charAt(0).toUpperCase()}</Avatar>
                <Typography variant="body2">{user?.fullName}</Typography>
                <Button
                  size="small"
                  onClick={async () => {
                    await logout();
                    navigate('/');
                  }}
                >
                  Log out
                </Button>
              </Stack>
            </Toolbar>
          </AppBar>
          <Box component="main" sx={{ p: 4, flexGrow: 1 }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
