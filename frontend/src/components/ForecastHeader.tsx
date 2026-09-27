import { useNavigate } from 'react-router-dom';
import { STATIONS } from '../stations';
import type { GfsWaveForecast } from '../types';

export function ForecastHeader({
  token,
  data,
  selectedStation,
  onSelectStation,
  onLogout,
}: {
  token: string | null;
  data: GfsWaveForecast | null;
  selectedStation: string;
  onSelectStation: (stationId: string) => void;
  onLogout: () => void;
}) {
  const navigate = useNavigate();

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
        {token ? (
          <button
            type="button"
            onClick={() => { onLogout(); navigate('/login'); }}
          >
            Logout
          </button>
        ) : (
          <button type="button" onClick={() => navigate('/login')}>
            Login
          </button>
        )}
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
