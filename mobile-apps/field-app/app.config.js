// Author: Robert Massey | Created: 2026-07-16 | Module: Field App — Expo Config
// Dynamic Expo config — supports EAS file secrets for google-services.json.
//
// google-services.json strategy (SB-009 push — optional):
//   EAS Build:  set GOOGLE_SERVICES_JSON as a "File" secret in the EAS project.
//   Local dev:  place google-services.json beside this file (gitignored).
//   CI / no Firebase: omit — push unavailable; build still succeeds.
//
// Phase 0: no camera/location plugins — declare permissions only when M2 ships
// those features (honest App Store / Play usage strings).

const fs = require('fs');
const path = require('path');
const withStripMediaPermissions = require('./plugins/with-strip-media-permissions');

const googleServicesEnv = process.env.GOOGLE_SERVICES_JSON;
const googleServicesLocal = path.join(__dirname, 'google-services.json');

const googleServicesFile =
  googleServicesEnv && fs.existsSync(googleServicesEnv)
    ? googleServicesEnv
    : fs.existsSync(googleServicesLocal)
      ? './google-services.json'
      : null;

if (!googleServicesFile) {
  console.warn(
    '[app.config.js] GOOGLE_SERVICES_JSON not found — building without push notifications.\n' +
      '  To enable (SB-009): set the GOOGLE_SERVICES_JSON EAS file secret or place google-services.json here.',
  );
}

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: 'Attune Smart Forms',
  slug: 'attune-sb-smart-forms',
  version: '0.1.0',
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#EA580C',
  },
  // Placeholder until owner creates the Expo project and pastes the real id.
  // OTA updates stay disabled until projectId + updates.url are set.
  updates: {
    enabled: false,
    fallbackToCacheTimeout: 0,
  },
  // RULES (from enterprise Play rejection, Jul 2026):
  //  1. Bump on EVERY store submission and on ANY native/dependency change.
  //  2. Never publish a production OTA against an incompatible binary.
  runtimeVersion: '0.1.0',
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.attune.sb.smartforms',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
    package: 'com.attune.sb.smartforms',
    ...(googleServicesFile ? { googleServicesFile } : {}),
    permissions: ['android.permission.VIBRATE'],
    blockedPermissions: [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.CAMERA',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ],
    versionCode: 1,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    // MUST be last — removes media/high-risk permissions plugins may re-inject.
    withStripMediaPermissions,
  ],
  scheme: 'attune-sb',
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: { origin: false },
    eas: {
      // Replace after: eas init / Expo dashboard → project settings
      projectId: '00000000-0000-0000-0000-000000000000',
    },
    notificationsEnabled: !!googleServicesFile,
  },
  owner: 'robertmassey',
};

module.exports = { expo: config };
