import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mcs.app',
  appName: 'MCS App',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  }
};

export default config;

