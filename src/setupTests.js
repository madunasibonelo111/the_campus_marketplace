import { TextEncoder, TextDecoder } from 'util';


Object.defineProperty(global, 'TextEncoder', { value: TextEncoder });
Object.defineProperty(global, 'TextDecoder', { value: TextDecoder });

import '@testing-library/jest-dom';
import { vi } from 'vitest';

global.vi = vi;
