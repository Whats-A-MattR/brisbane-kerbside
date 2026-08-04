export type CollectionArea = {
  id: string;
  name: string;
};

export type Collection = {
  id: string;
  startsOn: string;
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
