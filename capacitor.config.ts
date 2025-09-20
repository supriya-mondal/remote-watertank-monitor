import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bitantler.waterinfo',
  appName: 'watertank-monitor',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'http://agent-water.local',
      'https://agent-water.local'
    ]
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
