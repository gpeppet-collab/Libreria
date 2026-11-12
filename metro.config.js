// Configurazione Metro.
// `.wasm` come asset: expo-sqlite sul web usa wa-sqlite (WebAssembly).
// Le intestazioni di isolamento per l'anteprima web le aggiunge scripts/web-preview.js.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm');

module.exports = config;
