import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexaesports.app',
  appName: 'Nexa Esports',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#18181b",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#0f0f0f",
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#18181b',
      overlaysWebView: false,
    },
  },
};

export default config;
