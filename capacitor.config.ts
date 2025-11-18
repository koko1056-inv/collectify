import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.98e2f873782e493cba8df72956b0a467',
  appName: 'collectify',
  webDir: 'dist',
  server: {
    url: 'https://98e2f873-782e-493c-ba8d-f72956b0a467.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    contentInset: 'always'
  }
};

export default config;
