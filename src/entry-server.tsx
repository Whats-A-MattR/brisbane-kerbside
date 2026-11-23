import { renderToString } from 'react-dom/server';
import { App } from './App';
import { UpdatesFormBuilder } from '@site/form-builder';
import type { Route, Schedule } from './types';

export function render(schedule: Schedule, route: Route) {
  return renderToString(<App schedule={schedule} route={route} formBuilder={UpdatesFormBuilder} />);
}
