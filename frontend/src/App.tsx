import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type NdbcRealtimeData = {
  columns: string[];
  units: string[];
  data: Record<string, (string | null)[]>;
};

function App({
  token,
  onAuthError,
  onLogout,
}: {
  token: string | null;
  onAuthError: () => void;
  onLogout: () => void;
}) {
  const [data, setData] = useState<NdbcRealtimeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const STATIONS = [
    '46211', '46213', '46214', '46215', '46218', '46219', '46221', '46222',
    '46224', '46225', '46229', '46232', '46236', '46239', '46243', '46244',
    '46248', '46251', '46253', '46254', '46256', '46258', '46267', '46268',
    '46274', '46275', '46277', '46278', '46285',
  ]

  if(selectedStation==null)setSelectedStation('46239');
  useEffect(() => {
    fetch(`/api/ndbc/${selectedStation}/parsed`
      , {headers: token ? { Authorization: `Bearer ${token}` } : {},}
    )
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          onAuthError();
          throw new Error('Session expired. Please log in again.');
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<NdbcRealtimeData>;
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [token, onAuthError]);
  const navigate = useNavigate();
  const loginButton = (
    <button
      type="button"
      onClick={() => navigate('/login')}
      style={{ position: 'absolute', top: '1rem', right: '1rem' }}
    >
      Login
    </button>
  );
  const selectBox = (
    <select onChange={(e) => setSelectedStation(e.target.value)}>
      {STATIONS.map((station) =>
        <option value = {station} >{station}</option>
      )}
    </select>
  );

  const logoutButton = (
    <button
      type="button"
      onClick={onLogout}
      style={{ position: 'absolute', top: '1rem', right: '1rem' }}
    >
      Logout
    </button>
  );

  if (error) {
    return (
      <div style={{ position: 'relative', padding: '2rem' }}>
        {logoutButton}
        <div>Error: {error}</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div style={{ position: 'relative', padding: '2rem' }}>
        {logoutButton}
        <div>Loading...</div>
      </div>
    );
  }
  return (
    <div style={{ position: 'relative', padding: '2rem', fontFamily: 'sans-serif' }}>
      {token?logoutButton:loginButton}
      {selectBox}
      <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto' }}>
        {data.columns.map((col, i) => (
          <div key={col}>
            <strong>{col}</strong>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{data.units[i]}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 0' }}>
              {data.data[col].map((value, row) => (
                <li key={row}>{value ?? '—'}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
