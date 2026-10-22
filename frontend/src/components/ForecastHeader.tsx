import { STATIONS } from '../stations';
import type { GfsWaveForecast } from '../types';

export function ForecastHeader({
  data,
  selectedStation,
  onSelectStation
}: {
  data: GfsWaveForecast | null;
  selectedStation: string;
  onSelectStation: (stationId: string) => void;
}) {

  return (
    <div className="forecast-header">
      <div className="forecast-header-controls">
        <select
          className="station-select"
          value={selectedStation}
          onChange={(e) => onSelectStation(e.target.value)}
        >
          {STATIONS.map((station) => (
            <option key={station.id} value={station.id}>
              {station.id} — {station.name}
            </option>
          ))}
        </select>
      </div>
      {data && (
        <div className="forecast-summary">
          <strong>Station {data.stationId}</strong>
          <span>
            {Math.abs(data.latitude).toFixed(2)}°{data.latitude >= 0 ? 'N' : 'S'},{' '}
            {Math.abs(data.longitude).toFixed(2)}°{data.longitude >= 0 ? 'E' : 'W'}
          </span>
          <span>Cycle: {new Date(data.cycle).toUTCString()}</span>
        </div>
      )}
    </div>
  );
}
