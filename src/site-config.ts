export type SiteConfig = {
  id: string;
  siteUrl: string;
  locale: string;
  timeZone: string;
  name: string;
  shortName: string;
  brandMark: string;
  headerLabel: string;
  placeName: string;
  councilName: string;
  serviceName: string;
  rules: {
    readyBy: string;
    householdLimit: string;
  };
  schedule: {
    singular: string;
    plural: string;
    startLabel: string;
    eyebrow: string;
    mapCaption: string;
  };
  area: {
    singular: string;
    plural: string;
    routeSegment: string;
  };
  map: {
    center: [number, number];
    zoom: number;
    maxSelectionZoom: number;
  };
  links: {
    repository: string;
    sponsor: string;
    kofi: string;
    officialCalendar: string;
    acceptedItems: string;
    directory: string;
  };
  analytics: {
    measurementId?: string;
  };
  seo: {
    homeTitle: string;
    homeDescription: string;
    socialImageAlt: string;
  };
  homeFaq: Array<{
    question: string;
    answer: string;
  }>;
  guideFaq: Array<{
    question: string;
    answer: string;
  }>;
};
