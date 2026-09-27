import { useEffect, useState } from 'react';
import { isTokenExpired } from '../auth';
import type { GfsWaveForecast } from '../types';

export function useGfsForecast(
  token: string | null,
  stationId: string,
  onAuthError: () => void,
): { data: GfsWaveForecast | null; error: string | null } {
  const [data, setData] = useState<GfsWaveForecast | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token && isTokenExpired(token)) {
      onAuthError();
      return;
    }
    setData(null);
    setError(null);
    fetch(`/api/gfs/${stationId}/forecast`)
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          onAuthError();
          throw new Error('Session expired. Please log in again.');
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<GfsWaveForecast>;
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [token, onAuthError, stationId]);

  return { data, error };
}
