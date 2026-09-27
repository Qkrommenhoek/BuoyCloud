import type { GfsWaveForecastRow } from '../types';

export function ForecastDetail({
  rows,
  selectedTime,
}: {
  rows: GfsWaveForecastRow[];
  selectedTime: string | null;
}) {
  const row = rows.find((r) => r.time === selectedTime) ?? rows[0] ?? null;
  if (!row) return null;

  return (
    <div className="forecast-detail">
      <div className="forecast-detail-header">
        <strong>{new Date(row.time).toISOString().replace('T', ' ').slice(0, 16)} UTC</strong>
        <span>Total: {row.totalWaveHeightFt} ft</span>
      </div>
      <ul className="forecast-detail-list">
        {row.systems.map((system, i) => (
          <li key={i}>
            Swell {i + 1}: {system.waveHeightFt} ft / {system.periodSec} s / {system.directionDeg}°
          </li>
        ))}
        {row.systems.length === 0 && <li>No swell components reported for this hour.</li>}
      </ul>
    </div>
  );
}
