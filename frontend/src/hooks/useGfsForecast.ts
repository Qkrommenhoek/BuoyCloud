import { useEffect, useState } from 'react';
import type { GfsWaveForecast } from '../types';

const POLL_MS = 5 * 60 * 1000;

type ApiForecastItem = {
  sk: string;
  cycle: string;
  lat: number;
  lon: number;
  source_url: string;
  hst_ft: number;
  partitions: { hs_ft: number; tp_s: number; dir_deg: number }[];
};

type ApiForecastResponse = {
  station_id: string;
  items: ApiForecastItem[];
  lastUpdated: string | null;
};

function toForecast(res: ApiForecastResponse): GfsWaveForecast | null {
  const first = res.items[0];
  if (!first) return null;
  return {
    stationId: res.station_id,
    latitude: first.lat,
    longitude: first.lon,
    cycle: first.cycle,
    sourceUrl: first.source_url,
    rows: res.items.map((it) => ({
      time: it.sk,
      totalWaveHeightFt: it.hst_ft,
      systems: it.partitions.map((p) => ({
        waveHeightFt: p.hs_ft,
        periodSec: p.tp_s,
        directionDeg: p.dir_deg,
      })),
    })),
  };
}

export function useGfsForecast(stationId: string): {
  data: GfsWaveForecast | null;
  error: string | null;
} {
  // Tagged with the station so a stale result never shows after switching stations.
  const [state, setState] = useState<{
    stationId: string;
    data: GfsWaveForecast | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () =>
      fetch(`/api/stations/${stationId}/forecast`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<ApiForecastResponse>;
        })
        .then((body) => {
          if (cancelled) return;
          const forecast = toForecast(body);
          setState({
            stationId,
            data: forecast,
            error: forecast ? null : 'No forecast available yet for this station.',
          });
        })
        .catch((err) => {
          if (cancelled) return;
          setState((prev) => ({
            stationId,
            data: prev?.stationId === stationId ? prev.data : null,
            error: err.message,
          }));
        });

    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };

    load();
    const timer = setInterval(load, POLL_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [stationId]);

  return state?.stationId === stationId
    ? { data: state.data, error: state.error }
    : { data: null, error: null };
}
