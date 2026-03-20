import type { CapacitorConfig } from '@capacitor/cli';

var config: CapacitorConfig = {
  appId: 'com.levelupstudios.lootbound',
  appName: 'LootBound',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      backgroundColor: '#FFFFFF',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FFFFFF',
    },
    Camera: {
      presentationStyle: 'fullscreen',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
