import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('[Main] Starting app initialization');

try {
  const rootElement = document.getElementById('root');
  console.log('[Main] Root element:', rootElement);

  if (!rootElement) {
    throw new Error('Root element not found');
  }

  console.log('[Main] Creating root');
  const root = createRoot(rootElement);

  console.log('[Main] Rendering app');
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );

  console.log('[Main] App rendered successfully');
} catch (error) {
  console.error('[Main] Failed to initialize app:', error);
  document.body.innerHTML = `<div style="padding: 20px; color: red;"><h1>Initialization Error</h1><pre>${error}</pre></div>`;
}
