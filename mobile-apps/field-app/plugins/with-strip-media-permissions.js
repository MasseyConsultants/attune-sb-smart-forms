// Author: Robert Massey | Created: 2026-07-16 | Module: Field App — Config Plugin
// Belt-and-suspenders media permission removal (ported from enterprise employee-app).
//
// Google Play policy: READ_MEDIA_IMAGES / READ_MEDIA_VIDEO are restricted permissions
// that require persistent, gallery-centric use cases. Attune captures photos in-app
// via the device camera (when enabled in M2) and uploads directly — no gallery access.
//
// References:
//   https://support.google.com/googleplay/android-developer/answer/14115180

const { withAndroidManifest } = require('@expo/config-plugins');

const BLOCKED = new Set([
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.RECORD_AUDIO',
  'android.permission.SYSTEM_ALERT_WINDOW',
]);

/**
 * @param {import('@expo/config-plugins').ExpoConfig} config
 * @returns {import('@expo/config-plugins').ExpoConfig}
 */
function withStripMediaPermissions(config) {
  return withAndroidManifest(config, (androidConfig) => {
    const manifest = androidConfig.modResults.manifest;

    const before = (manifest['uses-permission'] ?? []).length;

    manifest['uses-permission'] = (manifest['uses-permission'] ?? []).filter((entry) => {
      const name = entry.$?.['android:name'] ?? '';
      return !BLOCKED.has(name);
    });

    if (manifest.$) {
      manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';
    }

    for (const permission of BLOCKED) {
      manifest['uses-permission'].push({
        $: {
          'android:name': permission,
          'tools:node': 'remove',
        },
      });
    }

    if (manifest['uses-permission-sdk-23']) {
      manifest['uses-permission-sdk-23'] = manifest['uses-permission-sdk-23'].filter((entry) => {
        const name = entry.$?.['android:name'] ?? '';
        return !BLOCKED.has(name);
      });
    }

    const after = (manifest['uses-permission'] ?? []).length;
    const removed = before - after + BLOCKED.size;

    console.log(
      `[withStripMediaPermissions] Applied tools:node="remove" for ${BLOCKED.size} permission(s). Net change: ${removed > 0 ? `-${removed}` : removed} entries.`,
    );

    return androidConfig;
  });
}

module.exports = withStripMediaPermissions;
