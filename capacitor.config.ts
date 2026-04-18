import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'inc.mgc.collectify',
  appName: 'Collectify',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
  },
};

export default config;
