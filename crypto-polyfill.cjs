// Polyfill globalThis.crypto for Node 18 (needed by serialize-javascript in workbox-build)
if (!globalThis.crypto) {
  globalThis.crypto = require('crypto');
}
