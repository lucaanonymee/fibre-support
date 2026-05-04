import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Marker {
  x: number;
  y: number;
  lat?: number;
  lng?: number;
  label?: string;
  color?: string;
  type?: 'ticket' | 'tech' | 'admin';
}

interface MapPlaceholderProps {
  height?: number;
  markers?: Marker[];
  showPolygon?: boolean;
  showGrid?: boolean;
  center?: [number, number];
  zoom?: number;
  drawMode?: boolean;
  editablePolygon?: [number, number][];
  onEditablePolygonChange?: (polygon: [number, number][]) => void;
  draggableMarker?: boolean;
  draggableMarkerIndex?: number;
  onMarkerChange?: (position: { lat: number; lng: number; index: number }) => void;
}

// Tunis area bounding box for converting x,y percentages to lat,lng
const TUNIS_BOUNDS = {
  latMin: 36.78,
  latMax: 36.86,
  lngMin: 10.12,
  lngMax: 10.22,
};

function xyToLatLng(x: number, y: number): [number, number] {
  const lat = TUNIS_BOUNDS.latMax - (y / 100) * (TUNIS_BOUNDS.latMax - TUNIS_BOUNDS.latMin);
  const lng = TUNIS_BOUNDS.lngMin + (x / 100) * (TUNIS_BOUNDS.lngMax - TUNIS_BOUNDS.lngMin);
  return [lat, lng];
}

function hasLatLng(marker: Marker): marker is Marker & { lat: number; lng: number } {
  return typeof marker.lat === 'number' && typeof marker.lng === 'number';
}

function createMarkerIcon(color: string, type?: string): L.DivIcon {
  if (type === 'tech') {
    return L.divIcon({
      className: '',
      html: `<div style="
        width: 28px; height: 28px; border-radius: 50%;
        background: ${color || '#1a237e'}; border: 3px solid white;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        color: white; font-size: 12px; font-weight: 800;
      ">T</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -16],
    });
  }

  return L.divIcon({
    className: '',
    html: `<div style="
      width: 14px; height: 14px; border-radius: 50%;
      background: ${color || '#ff9800'}; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      position: relative;
    "></div>
    <div style="
      width: 3px; height: 12px; background: ${color || '#ff9800'};
      margin: -2px auto 0; border-radius: 0 0 2px 2px;
    "></div>`,
    iconSize: [20, 28],
    iconAnchor: [10, 28],
    popupAnchor: [0, -30],
  });
}

function createVertexIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 12px; height: 12px; border-radius: 50%;
      background: #1a237e; border: 2px solid white;
      box-shadow: 0 1px 5px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

// Polygon around Tunis Centre zone
const ZONE_POLYGON: [number, number][] = [
  [36.8350, 10.1520],
  [36.8350, 10.1820],
  [36.8150, 10.1980],
  [36.7950, 10.1820],
  [36.7950, 10.1520],
  [36.8050, 10.1380],
];

const DEFAULT_MARKERS: Marker[] = [
  { x: 45, y: 30, label: 'TKT-001', color: '#ff9800', type: 'ticket' },
  { x: 62, y: 45, label: 'TKT-002', color: '#2196f3', type: 'ticket' },
  { x: 35, y: 55, label: 'TKT-003', color: '#ff9800', type: 'ticket' },
  { x: 70, y: 38, label: 'TKT-004', color: '#4caf50', type: 'ticket' },
  { x: 52, y: 62, color: '#1a237e', type: 'tech', label: 'Technicien A' },
  { x: 40, y: 70, color: '#1a237e', type: 'tech', label: 'Technicien B' },
];

export function MapPlaceholder({
  height = 320,
  markers = [],
  showPolygon = true,
  center,
  zoom,
  drawMode = false,
  editablePolygon = [],
  onEditablePolygonChange,
  draggableMarker = false,
  draggableMarkerIndex = 0,
  onMarkerChange,
}: MapPlaceholderProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const staticPolygonRef = useRef<L.Polygon | null>(null);
  const editableLayerRef = useRef<L.LayerGroup | null>(null);
  const editablePolygonRef = useRef<[number, number][]>(editablePolygon);
  const lastAppliedCenterRef = useRef<[number, number] | null>(null);
  const lastAppliedZoomRef = useRef<number | null>(null);

  const defaultMarkers: Marker[] = markers.length > 0 ? markers : DEFAULT_MARKERS;
  const markerToLatLng = (marker: Marker): [number, number] => {
    return hasLatLng(marker) ? [marker.lat, marker.lng] : xyToLatLng(marker.x, marker.y);
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let initialCenter: [number, number] = center || [36.8189, 10.1658];
    const initialZoom = zoom || 13;

    if (!center && defaultMarkers.length > 0) {
      const latlngs = defaultMarkers.map(markerToLatLng);
      const avgLat = latlngs.reduce((sum, current) => sum + current[0], 0) / latlngs.length;
      const avgLng = latlngs.reduce((sum, current) => sum + current[1], 0) / latlngs.length;
      initialCenter = [avgLat, avgLng];
    }

    const map = L.map(mapRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: true,
      attributionControl: true,
    });

    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Smart Fibre TT',
      maxZoom: 19,
    }).addTo(map);

    if (!center && defaultMarkers.length > 1) {
      const bounds = L.latLngBounds(defaultMarkers.map(markerToLatLng));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: zoom || 15 });
    }

    lastAppliedCenterRef.current = [map.getCenter().lat, map.getCenter().lng];
    lastAppliedZoomRef.current = map.getZoom();

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerLayerRef.current = null;
      staticPolygonRef.current = null;
      editableLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (center) {
      const targetZoom = typeof zoom === 'number' ? zoom : map.getZoom();
      const previousCenter = lastAppliedCenterRef.current;
      const previousZoom = lastAppliedZoomRef.current;
      const centerChanged =
        !previousCenter ||
        Math.abs(previousCenter[0] - center[0]) > 1e-9 ||
        Math.abs(previousCenter[1] - center[1]) > 1e-9;
      const zoomChanged = previousZoom !== targetZoom;

      if (centerChanged || zoomChanged) {
        map.setView(center, targetZoom, { animate: false });
        lastAppliedCenterRef.current = [center[0], center[1]];
        lastAppliedZoomRef.current = targetZoom;
      }
    } else if (typeof zoom === 'number' && lastAppliedZoomRef.current !== zoom) {
      map.setZoom(zoom);
      lastAppliedZoomRef.current = zoom;
    }
  }, [center, zoom]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (staticPolygonRef.current) {
      staticPolygonRef.current.remove();
      staticPolygonRef.current = null;
    }

    if (showPolygon) {
      staticPolygonRef.current = L.polygon(ZONE_POLYGON, {
        color: '#42a5f5',
        weight: 2,
        dashArray: '6, 3',
        fillColor: '#42a5f5',
        fillOpacity: 0.1,
      }).addTo(map);
    }
  }, [showPolygon]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (markerLayerRef.current) {
      markerLayerRef.current.remove();
      markerLayerRef.current = null;
    }

    const layerGroup = L.layerGroup();

    defaultMarkers.forEach((markerData, index) => {
      const position = markerToLatLng(markerData);
      const icon = createMarkerIcon(markerData.color || '#ff9800', markerData.type);
      const marker = L.marker(position, {
        icon,
        draggable: draggableMarker && index === draggableMarkerIndex,
      });

      if (draggableMarker && index === draggableMarkerIndex && onMarkerChange) {
        marker.on('dragend', () => {
          const markerPosition = marker.getLatLng();
          onMarkerChange({ lat: markerPosition.lat, lng: markerPosition.lng, index });
        });
      }

      if (markerData.label) {
        const tooltipBg = markerData.type === 'tech' ? '#1a237e' : (markerData.color || '#ff9800');
        marker.bindTooltip(markerData.label, {
          permanent: true,
          direction: 'top',
          offset: [0, markerData.type === 'tech' ? -14 : -28],
          className: 'leaflet-custom-tooltip',
        });
        marker.on('tooltipopen', (event) => {
          const element = event.tooltip.getElement();
          if (element) {
            element.style.background = tooltipBg;
            element.style.color = 'white';
            element.style.border = 'none';
            element.style.borderRadius = '4px';
            element.style.padding = '2px 8px';
            element.style.fontSize = '11px';
            element.style.fontWeight = '700';
            element.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';
            const arrow = element.querySelector('.leaflet-tooltip-top') as HTMLElement;
            if (arrow) {
              arrow.style.borderTopColor = tooltipBg;
            }
          }
        });
        marker.openTooltip();
      }

      marker.addTo(layerGroup);
    });

    layerGroup.addTo(map);
    markerLayerRef.current = layerGroup;
  }, [defaultMarkers, draggableMarker, draggableMarkerIndex, onMarkerChange]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (editableLayerRef.current) {
      editableLayerRef.current.remove();
      editableLayerRef.current = null;
    }

    if (editablePolygon.length === 0) {
      return;
    }

    const layerGroup = L.layerGroup();

    const canEditVertices = drawMode && Boolean(onEditablePolygonChange);

    editablePolygon.forEach((point, index) => {
      const vertexMarker = L.marker(point, {
        icon: createVertexIcon(),
        draggable: canEditVertices,
        keyboard: false,
        zIndexOffset: 1000,
      });

      if (canEditVertices && onEditablePolygonChange) {
        vertexMarker.on('dragstart', () => {
          map.dragging.disable();
        });

        vertexMarker.on('dragend', () => {
          map.dragging.enable();
          const markerPosition = vertexMarker.getLatLng();
          const updatedPolygon = editablePolygon.map((currentPoint, currentIndex) => {
            if (currentIndex === index) {
              return [markerPosition.lat, markerPosition.lng] as [number, number];
            }
            return currentPoint;
          });
          onEditablePolygonChange(updatedPolygon);
        });

        vertexMarker.on('contextmenu', (event: L.LeafletMouseEvent) => {
          L.DomEvent.preventDefault(event.originalEvent);
          L.DomEvent.stopPropagation(event.originalEvent);
          const updatedPolygon = editablePolygon.filter((_, currentIndex) => currentIndex !== index);
          onEditablePolygonChange(updatedPolygon);
        });
      }

      vertexMarker.addTo(layerGroup);
    });

    if (editablePolygon.length >= 3) {
      L.polygon(editablePolygon, {
        color: '#1a237e',
        weight: 2,
        fillColor: '#1a237e',
        fillOpacity: drawMode ? 0.2 : 0.12,
      }).addTo(layerGroup);
    } else if (editablePolygon.length >= 2) {
      L.polyline(editablePolygon, {
        color: '#1a237e',
        weight: 2,
        dashArray: drawMode ? '4, 4' : undefined,
      }).addTo(layerGroup);
    }

    layerGroup.addTo(map);
    editableLayerRef.current = layerGroup;
  }, [editablePolygon, drawMode, onEditablePolygonChange]);

  useEffect(() => {
    editablePolygonRef.current = editablePolygon;
  }, [editablePolygon]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !drawMode || !onEditablePolygonChange) return;

    const container = map.getContainer();
    const previousCursor = container.style.cursor;
    container.style.cursor = 'crosshair';

    const handleClick = (event: L.LeafletMouseEvent) => {
      const currentPolygon = editablePolygonRef.current;
      onEditablePolygonChange([
        ...currentPolygon,
        [event.latlng.lat, event.latlng.lng],
      ]);
    };

    const handleContextMenu = (event: L.LeafletMouseEvent) => {
      L.DomEvent.preventDefault(event.originalEvent);
      L.DomEvent.stopPropagation(event.originalEvent);
      const currentPolygon = editablePolygonRef.current;
      if (currentPolygon.length === 0) return;
      onEditablePolygonChange(currentPolygon.slice(0, -1));
    };

    map.doubleClickZoom.disable();
    map.on('click', handleClick);
    map.on('contextmenu', handleContextMenu);

    return () => {
      map.off('click', handleClick);
      map.off('contextmenu', handleContextMenu);
      if (!map.doubleClickZoom.enabled()) {
        map.doubleClickZoom.enable();
      }
      container.style.cursor = previousCursor;
    };
  }, [drawMode, onEditablePolygonChange]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const timeout = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100);
    return () => clearTimeout(timeout);
  }, [height]);

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height,
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #e0e0e0',
        }}
      />
      {/* Legend */}
      {defaultMarkers.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 28, left: 12, zIndex: 1000,
          background: 'rgba(255,255,255,0.94)', borderRadius: 8,
          padding: '8px 12px', fontSize: 11,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          border: '1px solid rgba(0,0,0,0.08)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: '#333' }}>Légende</div>
          {[
            { color: '#ff9800', label: 'Ticket OUVERT' },
            { color: '#2196f3', label: 'Ticket EN_COURS' },
            { color: '#4caf50', label: 'Ticket CLÔTURÉ' },
            { color: '#1a237e', label: 'Technicien' },
          ].map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
              <span style={{ color: '#555' }}>{l.label}</span>
            </div>
          ))}
          {showPolygon && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ width: 20, height: 2, background: '#42a5f5', display: 'inline-block', borderTop: '2px dashed #42a5f5' }} />
              <span style={{ color: '#555' }}>Zone intervention</span>
            </div>
          )}
          {drawMode && (
            <div style={{ marginTop: 6, color: '#1a237e', fontWeight: 700 }}>
              Clic gauche: ajouter un point · Clic droit: annuler le dernier
            </div>
          )}
        </div>
      )}
      <style>{`
        .leaflet-custom-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-custom-tooltip::before {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

export default MapPlaceholder;
