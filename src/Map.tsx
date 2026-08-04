import { useEffect, useRef } from 'react';
import type { GeoJSON as LeafletGeoJSON, Map as LeafletMap, Path } from 'leaflet';

type MapProps = {
  selectedDate: string;
  selectedLabel: string;
  selectedSuburb?: string;
};

const DEFAULT_CENTER: [number, number] = [-27.4698, 153.0251];

function isSelected(properties: GeoJSON.GeoJsonProperties | undefined, date: string, suburb?: string) {
  if (!properties || properties.collectionDate !== date) return false;
  return suburb ? properties.id === suburb : true;
}

export function CollectionMap({ selectedDate, selectedLabel, selectedSuburb }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const areasRef = useRef<LeafletGeoJSON | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initialiseMap() {
      if (!containerRef.current || mapRef.current) return;

      const L = await import('leaflet');
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: DEFAULT_CENTER,
        zoom: 10,
        zoomControl: false,
        preferCanvas: true,
      });
      mapRef.current = map;

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
        {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        },
      ).addTo(map);

      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/areas.geojson`);
        if (!response.ok) throw new Error(`Map data returned ${response.status}`);
        const geoJson = await response.json();
        if (cancelled) return;

        const areas = L.geoJSON(geoJson, {
          style: (feature) => {
            const active = isSelected(feature?.properties, selectedDate, selectedSuburb);
            return {
              color: active ? '#182d27' : '#60736b',
              weight: active ? 2 : 0.7,
              opacity: active ? 1 : 0.32,
              fillColor: active ? '#e4ff68' : '#7d948b',
              fillOpacity: active ? 0.72 : 0.08,
            };
          },
          onEachFeature: (feature, layer) => {
            layer.bindTooltip(feature.properties.suburb, {
              sticky: true,
              direction: 'top',
            });
          },
        }).addTo(map);
        areasRef.current = areas;

        const selectedLayers: Path[] = [];
        areas.eachLayer((layer) => {
          const path = layer as Path & { feature?: GeoJSON.Feature };
          if (isSelected(path.feature?.properties, selectedDate, selectedSuburb)) {
            selectedLayers.push(path);
          }
        });
        if (selectedLayers.length) {
          map.fitBounds(L.featureGroup(selectedLayers).getBounds().pad(0.3), {
            maxZoom: 12,
            animate: false,
          });
        }
      } catch (error) {
        console.error('Unable to load collection areas', error);
        containerRef.current?.classList.add('map--error');
      }
    }

    void initialiseMap();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      areasRef.current = null;
    };
  }, []);

  useEffect(() => {
    async function updateSelection() {
      const map = mapRef.current;
      const areas = areasRef.current;
      if (!map || !areas) return;

      const L = await import('leaflet');
      const selectedLayers: Path[] = [];
      areas.eachLayer((layer) => {
        const path = layer as Path & { feature?: GeoJSON.Feature };
        const active = isSelected(path.feature?.properties, selectedDate, selectedSuburb);
        path.setStyle({
          color: active ? '#182d27' : '#60736b',
          weight: active ? 2 : 0.7,
          opacity: active ? 1 : 0.32,
          fillColor: active ? '#e4ff68' : '#7d948b',
          fillOpacity: active ? 0.72 : 0.08,
        });
        if (active) {
          path.bringToFront();
          selectedLayers.push(path);
        }
      });

      if (selectedLayers.length) {
        map.fitBounds(L.featureGroup(selectedLayers).getBounds().pad(0.3), {
          maxZoom: 12,
        });
      }
    }

    void updateSelection();
  }, [selectedDate, selectedSuburb]);

  return (
    <div className="map-shell">
      <div className="map-caption" aria-live="polite">
        <span>Showing collection week</span>
        <strong>{selectedLabel}</strong>
      </div>
      <div
        ref={containerRef}
        className="map"
        role="img"
        aria-label={`Map of suburbs with collection starting ${selectedLabel}`}
      />
      <noscript>The interactive map needs JavaScript, but all upcoming dates are listed on this page.</noscript>
    </div>
  );
}
