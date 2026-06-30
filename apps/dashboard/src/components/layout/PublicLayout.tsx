import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

export function PublicLayout() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PublicHeader />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>
      <PublicFooter />
    </Box>
  );
}
