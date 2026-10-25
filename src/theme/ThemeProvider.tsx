import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import {
  layout,
  palettes,
  radius,
  spacing,
  typography,
  type ColorScheme,
  type Palette,
} from './tokens';

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  layout: typeof layout;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();

  const theme = useMemo<Theme>(() => {
    // The app follows the system appearance. An in-app override (Settings →
    // Appearance) is tracked as a separate feature; when it lands, resolve it
    // here instead of reading `useColorScheme()` directly.
    const scheme: ColorScheme = systemScheme === 'dark' ? 'dark' : 'light';
    return {
      scheme,
      colors: palettes[scheme],
      typography,
      spacing,
      radius,
      layout,
    };
  }, [systemScheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme() must be called inside <ThemeProvider>.');
  }
  return theme;
}
