import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env': {
        VITE_OPENAI_API_KEY: JSON.stringify(env.VITE_OPENAI_API_KEY),
        VITE_QUICKNODE_FUEL_URL: JSON.stringify(env.VITE_QUICKNODE_FUEL_URL),
        VITE_QUICKNODE_CG_URL: JSON.stringify(env.VITE_QUICKNODE_CG_URL),
      },
      global: 'globalThis',
    },
    optimizeDeps: {
      include: ['@fuels/react', '@goat-sdk/core', 'fuels'],
      exclude: ['lucide-react'],
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  };
});
