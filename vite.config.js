import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // This maps the @/ to the src folder like the site does
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js', './vitest-setup.js'],
    css: true,
    
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    coverage: {
      provider: 'istanbul', 
      reporter: ['text', 'html', 'lcov'], //  Added 'lcov' here for Codecov
      all: true,
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx', 
        'src/App.jsx', 
        '**/node_modules/**', 
        'src/supabase/supabaseClient.js',
        '**/*.test.jsx'
      ],
      thresholds: {
        lines: 20, //
      }
    },
  },
});
