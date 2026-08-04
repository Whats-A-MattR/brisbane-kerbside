import { renderToString } from 'react-dom/server';
import { App } from './App';
import type { Route, Schedule } from './types';

export function render(schedule: Schedule, route: Route) {
  return renderToString(<App schedule={schedule} route={route} />);
}
