export type CollectionArea = {
  id: string;
  name: string;
  note?: string;
};

export type Collection = {
  id: string;
  startsOn: string;
  endsOn?: string;
  putOutFrom: string;
  areas: CollectionArea[];
};

export type AreaDirectoryEntry = CollectionArea & {
  nextCollectionId?: string;
  lastCollection?: {
    startsOn: string;
    endsOn?: string;
    putOutFrom: string;
  };
};

export type Schedule = {
  schemaVersion: 1;
  siteId: string;
  generatedAt: string;
  source: {
    publisher: string;
    url: string;
    licence?: string;
  };
  areaDirectory?: AreaDirectoryEntry[];
  collections: Collection[];
};

export type Route =
  | { type: 'home' }
  | { type: 'about' }
  | { type: 'guide' }
  | { type: 'privacy' }
  | { type: 'collection'; id: string }
  | { type: 'area'; id: string };
