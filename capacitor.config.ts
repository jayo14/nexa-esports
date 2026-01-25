import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexaesports.app',
  appName: 'Nexa Esports',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#002368",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#C1B66D",
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#002368',
      overlaysWebView: false,
    },
  },
};

export default config;
