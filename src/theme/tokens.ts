// Nocturne design-system tokens (project/_ds/nocturne-*/styles.css). Every
// colour in the app is derived from these ramps — no ad-hoc hex values.

export const nocturne = {
  bg: '#161826',
  surface: '#232532',
  text: '#e9e9ed',
  accent: '#9184d9',
  accent2: '#a7a1db',
  neutral: {
    100: '#f3f5fe',
    200: '#e4e7f5',
    300: '#cfd3e5',
    400: '#b2b6ca',
    500: '#9397ab',
    600: '#75798c',
    700: '#595d6c',
    800: '#3f424d',
    900: '#292b31',
  },
  accentRamp: {
    100: '#f5f4ff',
    200: '#e7e5fe',
    300: '#d2cefd',
    400: '#b5abfc',
    500: '#968ae0',
    600: '#796cbf',
    700: '#5d5294',
    800: '#423a6a',
    900: '#2b2741',
  },
  accent2Ramp: {
    100: '#f5f4ff',
    200: '#e7e5fe',
    300: '#d2cefd',
    400: '#b5afe8',
    500: '#9690c9',
    600: '#7972a9',
    700: '#5c5783',
    800: '#423e5d',
    900: '#2b293a',
  },
  // Device-frame ink from the prototype; used only for scrims.
  ink: '#0d0c0c',
} as const;

export const radius = { sm: 4, md: 8, lg: 14 } as const;

export const font = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;
