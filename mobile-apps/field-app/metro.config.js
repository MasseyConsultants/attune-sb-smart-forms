// Author: Robert Massey | Created: 2026-07-16 | Module: Field App Metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '../..');
const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// expo-crypto AES stub pattern kept ready for when crypto lands in M1 storage.
// Phase 0 does not depend on expo-crypto; stubs are harmless if unused.
const NOOP_STUB = path.resolve(__dirname, 'native-stubs/noop-native-module.js');
const AES_STUB = path.resolve(__dirname, 'native-stubs/noop-aes-module.js');

const STUBBED_MODULES = [
  { package: 'expo-notifications', file: 'TopicSubscriptionModule', stub: NOOP_STUB },
  { package: 'expo-crypto', file: 'ExpoCryptoAES', stub: AES_STUB },
];

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const { package: pkg, file, stub } of STUBBED_MODULES) {
    if (
      context.originModulePath.includes(pkg) &&
      (moduleName === `./${file}` || moduleName.endsWith(`/${file}`))
    ) {
      return { type: 'sourceFile', filePath: stub };
    }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
