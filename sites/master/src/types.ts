export type MasterCouncil = {
  id: string;
  label: string;
  councilName: string;
  placeName: string;
  serviceModel: 'scheduled' | 'on_demand' | 'hybrid';
  siteUrl: string;
  actionUrl: string;
  serviceName: string;
  serviceDetails: null | {
    model: 'on_demand' | 'hybrid';
    shortLabel: string;
    summary: string;
    frequency: string;
    allowance: string;
    eligibility: string;
    timing: string;
    items: string;
    notice?: string;
  };
  center: [number, number];
  scheduleLabel: string;
  areaLabel: string;
  areaRouteSegment: string;
  areas: string[];
  areaDetails: Array<{
    id: string;
    name: string;
    collectionIds: string[];
    lastCollection?: {
      startsOn: string;
      endsOn?: string;
      putOutFrom: string;
    };
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
    booking: string | null;
    areaSource: string;
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
