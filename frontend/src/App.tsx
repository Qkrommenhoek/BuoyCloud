import { useState } from 'react';
import { ForecastDetail } from './components/ForecastDetail';
import { ForecastHeader } from './components/ForecastHeader';
import { StationMap } from './components/StationMap';
import { SwellCompass } from './components/SwellCompass';
import { SwellHeightChart } from './components/SwellHeightChart';
import { useGfsForecast } from './hooks/useGfsForecast';
import './forecast.css';

const DEFAULT_STATION = '46239';

function App() {
  const [selectedStation, setSelectedStation] = useState(DEFAULT_STATION);
  const [pickedTime, setSelectedTime] = useState<string | null>(null);
  const { data, error } = useGfsForecast(selectedStation);
  // Fall back to the first row when the pick isn't in the current data (new station, or a poll dropped it).
  const selectedTime =
    pickedTime && data?.rows.some((r) => r.time === pickedTime) ? pickedTime : data?.rows[0]?.time ?? null;

  return (
    <div className="forecast-page">
      <ForecastHeader
        data={data}
        selectedStation={selectedStation}
        onSelectStation={setSelectedStation}
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
