// Polyfill TextEncoder / TextDecoder for environments lacking them (Node < 19)
const { TextEncoder, TextDecoder } = require('util');
if (!global.TextEncoder) { global.TextEncoder = TextEncoder; }
if (!global.TextDecoder) { global.TextDecoder = TextDecoder; }
