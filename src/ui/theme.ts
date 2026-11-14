import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

export interface Theme {
  dark: boolean;
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    textMuted: string;
    border: string;
    primary: string;
    onPrimary: string;
    danger: string;
    star: string;
    chip: string;
    chipSelected: string;
    chipText: string;
    chipTextSelected: string;
  };
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  radius: { sm: number; md: number; lg: number };
}

const base = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  radius: { sm: 6, md: 10, lg: 16 },
};

export const lightTheme: Theme = {
  ...base,
  dark: false,
  colors: {
    background: '#F7F6F2',
    surface: '#FFFFFF',
    surfaceAlt: '#EFEDE6',
    text: '#1E1E1E',
    textMuted: '#6B6B6B',
    border: '#DCD9D0',
    primary: '#C2410C',
    onPrimary: '#FFFFFF',
    danger: '#B91C1C',
    star: '#D97706',
    chip: '#EFEDE6',
    chipSelected: '#C2410C',
    chipText: '#1E1E1E',
    chipTextSelected: '#FFFFFF',
  },
};

export const darkTheme: Theme = {
  ...base,
  dark: true,
  colors: {
    background: '#141414',
    surface: '#1F1F1F',
    surfaceAlt: '#2A2A2A',
    text: '#F2F2F2',
    textMuted: '#A3A3A3',
    border: '#3A3A3A',
    primary: '#F97316',
    onPrimary: '#1E1E1E',
    danger: '#F87171',
    star: '#FBBF24',
    chip: '#2A2A2A',
    chipSelected: '#F97316',
    chipText: '#F2F2F2',
    chipTextSelected: '#1E1E1E',
  },
};

/** Preferenza dell'utente: seguire il telefono oppure forzare chiaro o scuro. */
export type ThemePreference = 'system' | 'light' | 'dark';
export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

export function parseThemePreference(value: string | null | undefined): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export const ThemePreferenceContext = createContext<{
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}>({ preference: 'system', setPreference: () => {} });

export function useThemePreference() {
  return useContext(ThemePreferenceContext);
}

export function useTheme(): Theme {
  const system = useColorScheme();
  const { preference } = useContext(ThemePreferenceContext);
  const dark = preference === 'system' ? system === 'dark' : preference === 'dark';
  return dark ? darkTheme : lightTheme;
}

/** Colore di sfondo per una fascia d'età (chip), uguale in chiaro e scuro. */
export const AGE_RANGE_COLORS: Record<string, string> = {
  '0-2': '#FDE68A',
  '3-5': '#BBF7D0',
  '6-8': '#BFDBFE',
  '9-12': '#DDD6FE',
  '13+': '#FBCFE8',
  adulti: '#E5E7EB',
};
