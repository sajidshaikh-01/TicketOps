import { createTheme } from '@mui/material/styles';
import { tokens } from './tokens';

// "Venue at night" theme for the public site: dark surfaces, violet/amber
// accents. Used for browsing events, seat selection, and checkout - the
// parts of the app meant to feel a little cinematic.
export const publicTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: tokens.color.violet, dark: tokens.color.violetDark, light: tokens.color.violetLight },
    secondary: { main: tokens.color.amber, dark: tokens.color.amberDark },
    success: { main: tokens.color.teal },
    error: { main: tokens.color.coral },
    background: { default: tokens.color.nightBg, paper: tokens.color.nightSurface },
    text: { primary: tokens.color.nightTextPrimary, secondary: tokens.color.nightTextSecondary },
    divider: tokens.color.nightBorder,
  },
  typography: {
    fontFamily: tokens.font.body,
    h1: { fontFamily: tokens.font.display, fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontFamily: tokens.font.display, fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontFamily: tokens.font.display, fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontFamily: tokens.font.display, fontWeight: 600 },
    h5: { fontFamily: tokens.font.display, fontWeight: 600 },
    h6: { fontFamily: tokens.font.display, fontWeight: 600 },
    button: { fontFamily: tokens.font.body, fontWeight: 600, textTransform: 'none' },
  },
  shape: { borderRadius: tokens.radius.md },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: tokens.radius.sm, paddingInline: '20px', paddingBlock: '10px' },
        containedPrimary: {
          backgroundImage: `linear-gradient(135deg, ${tokens.color.violet}, ${tokens.color.violetDark})`,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.color.nightSurfaceRaised,
          border: `1px solid ${tokens.color.nightBorder}`,
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(11, 11, 20, 0.85)',
          backdropFilter: 'blur(12px)',
          backgroundImage: 'none',
          borderBottom: `1px solid ${tokens.color.nightBorder}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
  },
});
