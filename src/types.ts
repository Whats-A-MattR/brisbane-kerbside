export type Suburb = {
  id: string;
  name: string;
};

export type Collection = {
  id: string;
  collectionDate: string;
  itemsOutDate: string;
  suburbs: Suburb[];
};

export type Schedule = {
  generatedAt: string;
  sourceUrl: string;
  collections: Collection[];
};

export type Route =
  | { type: 'home' }
  | { type: 'privacy' }
  | { type: 'collection'; id: string }
  | { type: 'suburb'; id: string };
