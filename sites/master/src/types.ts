export type MasterCouncil = {
  id: string;
  label: string;
  councilName: string;
  placeName: string;
  siteUrl: string;
  serviceName: string;
  center: [number, number];
  scheduleLabel: string;
  areaLabel: string;
  areas: string[];
  collectionCount: number;
  generatedAt: string;
  nextCollection: null | {
    startsOn: string;
    endsOn?: string;
    areas: string[];
  };
  links: {
    officialCalendar: string;
    acceptedItems: string;
  };
  source: {
    publisher: string;
    url: string;
    licence: string | null;
  };
};

export type MasterData = {
  generatedAt: string;
  councils: MasterCouncil[];
};

export type MasterRoute =
  | { type: 'home' }
  | { type: 'councils' }
  | { type: 'council'; id: string }
  | { type: 'about' }
  | { type: 'privacy' };
