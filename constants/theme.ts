import { Platform } from 'react-native';

const tintColor = '#0a7ea4';

export const Colors = {
  primary: '#0a7ea4',
  primaryDark: '#086a8a',
  accent: '#e67e22',
  danger: '#e74c3c',
  success: '#27ae60',
  background: '#f5f6fa',
  surface: '#ffffff',
  text: '#11181C',
  textSecondary: '#687076',
  border: '#e0e0e0',
  tint: tintColor,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    mono: 'ui-monospace',
    rounded: 'ui-rounded',
  },
  default: {
    sans: 'normal',
    mono: 'monospace',
    rounded: 'normal',
  },
});
