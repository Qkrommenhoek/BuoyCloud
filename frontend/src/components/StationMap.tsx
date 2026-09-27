import { useEffect, useRef } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { STATIONS } from '../stations';

function FlyToSelected({ stationId }: { stationId: string }) {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    const station = STATIONS.find((s) => s.id === stationId);
    if (!station) return;
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    map.flyTo([station.latitude, station.longitude], Math.max(map.getZoom(), 7), { duration: 0.6 });
  }, [map, stationId]);

  return null;
}

export function StationMap({
  selectedStation,
  onSelectStation,
}: {
  selectedStation: string;
  onSelectStation: (stationId: string) => void;
}) {
  const mapRef = useRef<LeafletMap | null>(null);
  const bounds = STATIONS.map((s) => [s.latitude, s.longitude] as [number, number]);

  return (
    <MapContainer
      ref={mapRef}
      bounds={bounds}
      boundsOptions={{ padding: [24, 24] }}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToSelected stationId={selectedStation} />
      {STATIONS.map((station) => {
        const isSelected = station.id === selectedStation;
        return (
          <CircleMarker
            key={station.id}
            center={[station.latitude, station.longitude]}
            radius={isSelected ? 9 : 6}
            pathOptions={{
              color: isSelected ? '#aa3bff' : '#3b82f6',
              fillColor: isSelected ? '#aa3bff' : '#3b82f6',
              fillOpacity: isSelected ? 0.9 : 0.6,
              weight: isSelected ? 2 : 1,
            }}
            eventHandlers={{ click: () => onSelectStation(station.id) }}
          >
            <Tooltip>
              {station.id} — {station.name}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
