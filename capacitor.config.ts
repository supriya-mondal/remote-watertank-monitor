import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bitantler.waterinfo',
  appName: 'watertank-monitor',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'http://agent-water.local',
      'https://agent-water.local',
      'http://localhost',
      'http://127.0.0.1',
      'http://10.0.2.2'
    ],
    cleartext: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
