// Design tokens — single source of truth for all styling across the app
export const Colors = {
  // Backgrounds
  bg: {
    primary: '#0A0F1E',
    secondary: '#111827',
    card: '#1A2035',
    cardElevated: '#1F2B45',
    input: '#151D30',
    overlay: 'rgba(10,15,30,0.85)',
  },

  // Brand gradient stops
  brand: {
    from: '#6366F1',   // indigo
    mid: '#8B5CF6',    // violet
    to: '#A78BFA',     // light violet
  },

  accent: {
    cyan: '#22D3EE',
    green: '#10B981',
    amber: '#F59E0B',
    rose: '#F43F5E',
    blue: '#3B82F6',
  },

  // Text
  text: {
    primary: '#F1F5F9',
    secondary: '#94A3B8',
    muted: '#475569',
    inverse: '#0A0F1E',
    brand: '#A78BFA',
  },

  // Borders
  border: {
    default: '#1E2D45',
    active: '#6366F1',
    subtle: '#0F1929',
  },

  // Tags / badges
  badge: {
    course: { bg: 'rgba(99,102,241,0.15)', text: '#A78BFA', border: 'rgba(99,102,241,0.3)' },
    skill: { bg: 'rgba(34,211,238,0.15)', text: '#22D3EE', border: 'rgba(34,211,238,0.3)' },
    project: { bg: 'rgba(16,185,129,0.15)', text: '#10B981', border: 'rgba(16,185,129,0.3)' },
    cert: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', border: 'rgba(245,158,11,0.3)' },
  },
};

export const Typography = {
  // Font families (system defaults — no custom fonts needed for initial build)
  heading: { fontWeight: '700' as const },
  subheading: { fontWeight: '600' as const },
  body: { fontWeight: '400' as const },
  caption: { fontWeight: '400' as const, fontSize: 12 },

  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 36,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const Shadow = {
  card: {
    shadowColor: '#6366F1',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  button: {
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
};
