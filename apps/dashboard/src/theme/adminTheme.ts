import { createTheme } from '@mui/material/styles';
import { tokens } from './tokens';

// Light, data-dense theme for the admin/organizer back office. Long
// sessions staring at tables and dashboard numbers read better on a light
// surface than on the public site's dark "venue" theme, so this is a
// deliberately different mode rather than a recolor of the same one.
export const adminTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: tokens.color.violetDark, light: tokens.color.violet },
    secondary: { main: tokens.color.amberDark },
    success: { main: '#0F9D72' },
    error: { main: '#D6483F' },
    background: { default: tokens.color.paperMuted, paper: tokens.color.paper },
    text: { primary: tokens.color.lightTextPrimary, secondary: tokens.color.lightTextSecondary },
    divider: tokens.color.lightBorder,
  },
  typography: {
    fontFamily: tokens.font.body,
    h1: { fontFamily: tokens.font.display, fontWeight: 700 },
    h2: { fontFamily: tokens.font.display, fontWeight: 700 },
    h3: { fontFamily: tokens.font.display, fontWeight: 600 },
    h4: { fontFamily: tokens.font.display, fontWeight: 600, fontSize: '1.75rem' },
    h5: { fontFamily: tokens.font.display, fontWeight: 600 },
    h6: { fontFamily: tokens.font.display, fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: { borderRadius: tokens.radius.sm },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${tokens.color.lightBorder}`,
          boxShadow: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.color.paper,
          color: tokens.color.lightTextPrimary,
          boxShadow: 'none',
          borderBottom: `1px solid ${tokens.color.lightBorder}`,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, color: tokens.color.lightTextSecondary, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' },
      },
    },
  },
});
