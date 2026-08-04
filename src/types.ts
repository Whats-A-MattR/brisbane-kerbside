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

export type Schedule = {
  schemaVersion: 1;
  siteId: string;
  generatedAt: string;
  source: {
    publisher: string;
    url: string;
    licence?: string;
  };
  collections: Collection[];
};

export type Route =
  | { type: 'home' }
  | { type: 'about' }
  | { type: 'guide' }
  | { type: 'privacy' }
  | { type: 'collection'; id: string }
  | { type: 'area'; id: string };
