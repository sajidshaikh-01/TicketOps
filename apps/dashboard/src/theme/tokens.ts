// Design tokens for TicketOps. The public-facing site uses a dark "venue at
// night" palette (events, spotlights, evening energy); the admin back office
// uses a light, data-dense theme since long sessions reviewing tables and
// dashboards read better on a light surface. Both themes share the same
// type scale and accent colors so the brand feels continuous across the
// public/admin boundary.

export const tokens = {
  color: {
    // Core brand
    violet: '#6C5CE7', // primary: electric violet, spotlight/marquee energy
    violetDark: '#5641D8',
    violetLight: '#9C8FFF',
    amber: '#FFB454', // accent: ticket-stub gold
    amberDark: '#E89A38',
    teal: '#16C79A', // success / confirmed
    coral: '#FF6B6B', // error / cancelled

    // Dark surfaces (public site)
    nightBg: '#0B0B14',
    nightSurface: '#15141F',
    nightSurfaceRaised: '#1E1D2C',
    nightBorder: '#2C2A3D',
    nightTextPrimary: '#F5F3FF',
    nightTextSecondary: '#A8A4C0',

    // Light surfaces (admin)
    paper: '#FFFFFF',
    paperMuted: '#F7F6FB',
    lightBorder: '#E6E3F0',
    lightTextPrimary: '#1A1825',
    lightTextSecondary: '#615C77',
  },
  font: {
    display: '"Space Grotesk", "Inter", sans-serif',
    body: '"Inter", "Space Grotesk", sans-serif',
    mono: '"IBM Plex Mono", monospace', // booking refs, seat codes
  },
  radius: {
    sm: 8,
    md: 14,
    lg: 22,
  },
  shadow: {
    glow: '0 0 40px rgba(108, 92, 231, 0.25)',
  },
} as const;
