import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import { App } from './App';
import { initAnalytics } from './analytics';
import './styles.css';
import type { Route, Schedule } from './types';

const root = document.getElementById('root');
const dataElement = document.getElementById('kerbside-schedule');
const routeElement = document.getElementById('kerbside-route');

if (!root || !dataElement?.textContent || !routeElement?.textContent) {
  throw new Error('The pre-rendered schedule is missing.');
}

const schedule = JSON.parse(dataElement.textContent) as Schedule;
const route = JSON.parse(routeElement.textContent) as Route;

const app = (
  <StrictMode>
    <App schedule={schedule} route={route} />
  </StrictMode>
);

if (root.childElementCount > 0) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}

initAnalytics();
