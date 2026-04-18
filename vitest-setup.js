import { TextEncoder, TextDecoder } from 'node:util';


Object.defineProperties(globalThis, {
  TextEncoder: { value: TextEncoder, writable: true },
  TextDecoder: { value: TextDecoder, writable: true },
});


global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
