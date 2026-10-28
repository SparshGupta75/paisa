import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { StartupGate } from './components/Recovery';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StartupGate>
      <App />
    </StartupGate>
  </StrictMode>,
);
