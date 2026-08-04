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
  areaRouteSegment: string;
  areas: string[];
  areaDetails: Array<{
    id: string;
    name: string;
    collectionIds: string[];
  }>;
  collections: Array<{
    id: string;
    startsOn: string;
    endsOn?: string;
    putOutFrom?: string;
    areas: Array<{ id: string; name: string }>;
  }>;
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
  | { type: 'area'; councilId: string; id: string }
  | { type: 'collection'; councilId: string; id: string }
  | { type: 'about' }
  | { type: 'privacy' };
