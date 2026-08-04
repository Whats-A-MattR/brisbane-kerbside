import { useEffect, useRef } from 'react';
import type { GeoJSON as LeafletGeoJSON, Map as LeafletMap, Path } from 'leaflet';
import { siteConfig } from './site';

type MapProps = {
  selectedDate: string;
  selectedLabel: string;
  selectedArea?: string;
  caption?: string;
  selectableCollectionIds?: readonly string[];
  onAreaSelect?: (selection: MapAreaSelection) => void;
};

export type MapAreaSelection = {
  collectionId: string;
  areaId: string;
  areaName: string;
};

function isSelected(properties: GeoJSON.GeoJsonProperties | undefined, date: string, area?: string) {
  if (!properties || properties.startsOn !== date) return false;
  return area ? properties.areaId === area : true;
}

function areaSelection(properties: GeoJSON.GeoJsonProperties | undefined): MapAreaSelection | undefined {
  if (
    !properties ||
    typeof properties.collectionId !== 'string' ||
    typeof properties.areaId !== 'string' ||
    typeof properties.areaName !== 'string'
  ) return undefined;

  return {
    collectionId: properties.collectionId,
    areaId: properties.areaId,
    areaName: properties.areaName,
  };
}

function areaStyle(active: boolean, selectable: boolean, hovered = false) {
  if (active) {
    return {
      color: '#182d27',
      weight: hovered ? 2.6 : 2,
      opacity: 1,
      fillColor: '#e4ff68',
      fillOpacity: hovered ? 0.86 : 0.72,
    };
  }
  if (selectable) {
    return {
      color: '#47665c',
      weight: hovered ? 2 : 1.15,
      opacity: hovered ? 0.95 : 0.62,
      fillColor: hovered ? '#cfe6a0' : '#829b91',
      fillOpacity: hovered ? 0.42 : 0.16,
    };
  }
  return {
    color: '#60736b',
    weight: 0.7,
    opacity: 0.25,
    fillColor: '#7d948b',
    fillOpacity: 0.055,
  };
}

export function CollectionMap({
  selectedDate,
  selectedLabel,
  selectedArea,
  caption,
  selectableCollectionIds = [],
  onAreaSelect,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const areasRef = useRef<LeafletGeoJSON | null>(null);
  const selectionRef = useRef({ selectedDate, selectedArea });
  const selectableIdsRef = useRef(new Set(selectableCollectionIds));
  const onAreaSelectRef = useRef(onAreaSelect);

  selectionRef.current = { selectedDate, selectedArea };
  selectableIdsRef.current = new Set(selectableCollectionIds);
  onAreaSelectRef.current = onAreaSelect;

  useEffect(() => {
    let cancelled = false;

    async function initialiseMap() {
      if (!containerRef.current || mapRef.current) return;

      const L = await import('leaflet');
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: siteConfig.map.center,
        zoom: siteConfig.map.zoom,
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
            const selection = areaSelection(feature?.properties);
            const active = isSelected(feature?.properties, selectionRef.current.selectedDate, selectionRef.current.selectedArea);
            const selectable = Boolean(selection && selectableIdsRef.current.has(selection.collectionId));
            return areaStyle(active, selectable);
          },
          onEachFeature: (feature, layer) => {
            const selection = areaSelection(feature.properties);
            const isSelectable = () => Boolean(selection && selectableIdsRef.current.has(selection.collectionId));
            const tooltip = feature.properties.areaNote
              ? `${feature.properties.areaName}: ${feature.properties.areaNote}`
              : feature.properties.areaName;
            layer.bindTooltip(isSelectable() ? `${tooltip} · Select collection` : tooltip, {
              sticky: true,
              direction: 'top',
            });
            layer.on({
              mouseover: () => {
                if (!isSelectable()) return;
                map.getContainer().style.cursor = 'pointer';
                const active = isSelected(feature.properties, selectionRef.current.selectedDate, selectionRef.current.selectedArea);
                (layer as Path).setStyle(areaStyle(active, true, true));
                (layer as Path).bringToFront();
              },
              mouseout: () => {
                map.getContainer().style.cursor = '';
                const active = isSelected(feature.properties, selectionRef.current.selectedDate, selectionRef.current.selectedArea);
                (layer as Path).setStyle(areaStyle(active, isSelectable()));
              },
              click: () => {
                if (!selection || !isSelectable()) return;
                onAreaSelectRef.current?.(selection);
              },
            });
          },
        }).addTo(map);
        areasRef.current = areas;

        const selectedLayers: Path[] = [];
        areas.eachLayer((layer) => {
          const path = layer as Path & { feature?: GeoJSON.Feature };
          if (isSelected(path.feature?.properties, selectedDate, selectedArea)) {
            selectedLayers.push(path);
          }
        });
        if (selectedLayers.length) {
          map.fitBounds(L.featureGroup(selectedLayers).getBounds().pad(0.3), {
            maxZoom: siteConfig.map.maxSelectionZoom,
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
        const active = isSelected(path.feature?.properties, selectedDate, selectedArea);
        const selection = areaSelection(path.feature?.properties);
        const selectable = Boolean(selection && selectableIdsRef.current.has(selection.collectionId));
        path.setStyle(areaStyle(active, selectable));
        if (active) {
          path.bringToFront();
          selectedLayers.push(path);
        }
      });

      if (selectedLayers.length) {
        map.fitBounds(L.featureGroup(selectedLayers).getBounds().pad(0.3), {
          maxZoom: siteConfig.map.maxSelectionZoom,
        });
      }
    }

    void updateSelection();
  }, [selectedDate, selectedArea, selectableCollectionIds]);

  return (
    <div className="map-shell">
      <div className="map-caption" aria-live="polite">
        <span>{caption ?? siteConfig.schedule.mapCaption}</span>
        <strong>{selectedLabel}</strong>
        {onAreaSelect && <small>Select a suburb to find its date</small>}
      </div>
      <div
        ref={containerRef}
        className="map"
        role={onAreaSelect ? 'region' : 'img'}
        aria-label={onAreaSelect
          ? `Interactive map of ${siteConfig.area.plural}. Select a highlighted suburb to show its collection date.`
          : `Map of ${siteConfig.area.plural} for ${selectedLabel}`}
      />
      <noscript>The interactive map needs JavaScript, but all upcoming dates are listed on this page.</noscript>
    </div>
  );
}
