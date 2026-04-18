// Define the class manually to satisfy esbuild's Uint8Array check
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = class TextEncoder {
    encode(str) {
      return new Uint8Array(Array.from(str).map(c => c.charCodeAt(0)));
    }
  };
}

if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = class TextDecoder {
    decode(arr) {
      return String.fromCharCode.apply(null, arr);
    }
  };
}

global.TextEncoder = globalThis.TextEncoder;
global.TextDecoder = globalThis.TextDecoder;
