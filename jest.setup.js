import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from 'util';

// 1. Fix TextEncoder ReferenceError
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// 2. Fix import.meta.env SyntaxError
if (typeof global.import === 'undefined') {
  global.import = {
    meta: {
      env: {
        VITE_SUPABASE_URL: "https://placeholder.supabase.co",
        VITE_SUPABASE_ANON_KEY: "mock-key"
      }
    }
  };
}

global.alert = jest.fn();