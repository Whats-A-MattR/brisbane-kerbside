import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { initAnalytics } from './analytics';
import { App } from './App';
import type { MasterData, MasterRoute } from './types';
import './styles.css';

const root = document.getElementById('root');
const dataElement = document.getElementById('master-data');
const routeElement = document.getElementById('master-route');

if (!root || !dataElement?.textContent || !routeElement?.textContent) {
  throw new Error('The pre-rendered council directory is missing.');
}

const app = (
  <StrictMode>
    <App
      data={JSON.parse(dataElement.textContent) as MasterData}
      route={JSON.parse(routeElement.textContent) as MasterRoute}
    />
  </StrictMode>
);

if (root.childElementCount > 0) hydrateRoot(root, app);
else createRoot(root).render(app);

initAnalytics();
