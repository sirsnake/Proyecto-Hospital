import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hospital.urgencias',
  appName: 'Hospital Urgencias',
  webDir: 'dist',
  android: {
    // Allow mixed content for local dev and media
    allowMixedContent: true,
    // Capture input for camera/mic
    captureInput: true,
    // WebView settings for media
    webContentsDebuggingEnabled: false,
  },
  server: {
    // Allow loading content from these origins
    allowNavigation: [
      'sirsnake.pythonanywhere.com',
      '*.pythonanywhere.com',
      'localhost',
      '127.0.0.1'
    ],
    // Clear text allowed for local development
    cleartext: true,
  },
  plugins: {
    // No additional plugins needed - using native WebView APIs
  }
};

export default config;
