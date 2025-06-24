import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FuelProvider } from '@fuels/react';
import { defaultConnectors } from '@fuels/connectors';
import { validateConfig } from '@/config/constants';
import { NetworkProvider } from '@/contexts/NetworkContext';
import App from './App';
import './index.css';

// Validate configuration
const configValidation = validateConfig();
if (!configValidation.isValid && import.meta.env.DEV) {
  console.warn('Missing environment variables:', configValidation.missingVars);
  console.warn('AI features will use simulated responses.');
}

const queryClient = new QueryClient();

// Configure connectors
const connectors = defaultConnectors({ 
  devMode: false
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <FuelProvider 
        theme="dark"
        ui={false}
        fuelConfig={{ 
          connectors
        }}
      >
        <NetworkProvider>
          <App />
        </NetworkProvider>
      </FuelProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);