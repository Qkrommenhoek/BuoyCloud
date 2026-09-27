import { useEffect, useState } from 'react';
import { ForecastDetail } from './components/ForecastDetail';
import { ForecastHeader } from './components/ForecastHeader';
import { StationMap } from './components/StationMap';
import { SwellCompass } from './components/SwellCompass';
import { SwellHeightChart } from './components/SwellHeightChart';
import { useGfsForecast } from './hooks/useGfsForecast';
import './forecast.css';

const DEFAULT_STATION = '46239';

function App({
  token,
  onAuthError,
  onLogout,
}: {
  token: string | null;
  onAuthError: () => void;
  onLogout: () => void;
}) {
  const [selectedStation, setSelectedStation] = useState(DEFAULT_STATION);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const { data, error } = useGfsForecast(token, selectedStation, onAuthError);

  useEffect(() => {
    setSelectedTime(data?.rows[0]?.time ?? null);
  }, [data]);

  return (
    <div className="forecast-page">
      <ForecastHeader
        token={token}
        data={data}
        selectedStation={selectedStation}
        onSelectStation={setSelectedStation}
        onLogout={onLogout}
      />

      {error && <div>Error: {error}</div>}
      {!error && !data && <div>Loading...</div>}

      {data && (
        <div className="forecast-body">
          <div className="forecast-card forecast-map-card">
            <StationMap selectedStation={selectedStation} onSelectStation={setSelectedStation} />
          </div>

          <div className="forecast-card forecast-charts-card">
            <SwellHeightChart rows={data.rows} selectedTime={selectedTime} onSelectTime={setSelectedTime} />
            <div className="forecast-charts-row">
              <div className="forecast-compass-wrap">
                <SwellCompass rows={data.rows} selectedTime={selectedTime} />
              </div>
              <ForecastDetail rows={data.rows} selectedTime={selectedTime} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
