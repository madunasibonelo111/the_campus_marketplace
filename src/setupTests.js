if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    constructor() {}
    encode(str) {
      return new Uint8Array(Array.from(str).map(c => c.charCodeAt(0)));
    }
  };
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    constructor() {}
    decode(arr) {
      return String.fromCharCode.apply(null, arr);
    }
  };
}

globalThis.TextEncoder = global.TextEncoder;
globalThis.TextDecoder = global.TextDecoder;

import '@testing-library/jest-dom';
import { vi } from 'vitest';

global.vi = vi;
