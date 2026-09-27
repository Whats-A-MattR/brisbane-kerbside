import { renderToString } from 'react-dom/server';
import { App } from './App';
import { MasterUpdatesForm } from './UpdatesForm';
import type { MasterData, MasterRoute } from './types';

export function render(data: MasterData, route: MasterRoute) {
  return renderToString(<App data={data} route={route} formBuilder={MasterUpdatesForm} />);
}
