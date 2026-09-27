import { AreaUpdatesForm } from '../../src/forms/AreaUpdatesForm';
import type { UpdatesFormBuilderProps } from '../../src/forms/types';

export function UpdatesFormBuilder({ schedule }: UpdatesFormBuilderProps) {
  return <AreaUpdatesForm schedule={schedule} />;
}
