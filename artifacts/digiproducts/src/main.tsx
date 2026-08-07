import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';

import App from './App';
import { queryClient } from './lib/queryClient';
import { Toaster } from '@/components/ui/toaster';

import './index.css';

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <Toaster />
  </QueryClientProvider>,
);
