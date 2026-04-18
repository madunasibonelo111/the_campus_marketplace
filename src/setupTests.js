import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { TextEncoder, TextDecoder } from 'util'; 


global.vi = vi;
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
