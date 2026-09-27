export type NdbcRealtimeData = {
  columns: string[];
  units: string[];
  data: Record<string, (string | null)[]>;
};

export type GfsWaveSystem = {
  waveHeightFt: number;
  periodSec: number;
  directionDeg: number;
};

export type GfsWaveForecastRow = {
  time: string;
  totalWaveHeightFt: number;
  systems: GfsWaveSystem[];
};

export type GfsWaveForecast = {
  stationId: string;
  latitude: number;
  longitude: number;
  cycle: string;
  sourceUrl: string;
  rows: GfsWaveForecastRow[];
};
