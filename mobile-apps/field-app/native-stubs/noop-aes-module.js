// Stub for ExpoCryptoAES (expo-crypto SDK 55 pattern) — see enterprise metro notes.

class NoopEncryptionKey {}

class NoopSealedData {
  static fromCombined() {
    return new NoopSealedData();
  }
  static fromParts() {
    return new NoopSealedData();
  }
}

const unavailable = () =>
  Promise.reject(
    new Error(
      'AES encryption (ExpoCryptoAES) is not available in this build. ' +
        'Run a new EAS build to include the native module.',
    ),
  );

module.exports = {
  EncryptionKey: NoopEncryptionKey,
  SealedData: NoopSealedData,
  generateKey: unavailable,
  importKey: unavailable,
  encryptAsync: unavailable,
  decryptAsync: unavailable,
};
