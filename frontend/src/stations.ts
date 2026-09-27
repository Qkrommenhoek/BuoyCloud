export type Station = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

// NDBC/CDIP buoy metadata for the West Coast stations served by /api/gfs/{stationId}/forecast.
export const STATIONS: Station[] = [
  { id: '46211', name: 'Grays Harbor, WA', latitude: 46.857, longitude: -124.244 },
  { id: '46213', name: 'Cape Mendocino, CA', latitude: 40.2915, longitude: -124.7475 },
  { id: '46214', name: 'Point Reyes, CA', latitude: 37.9415, longitude: -123.4645 },
  { id: '46215', name: 'Diablo Canyon, CA', latitude: 35.2038, longitude: -120.8593 },
  { id: '46218', name: 'Harvest, CA', latitude: 34.4515, longitude: -120.78 },
  { id: '46219', name: 'San Nicolas Island, CA', latitude: 33.2255, longitude: -119.8915 },
  { id: '46221', name: 'Santa Monica Bay, CA', latitude: 33.8599, longitude: -118.6411 },
  { id: '46222', name: 'San Pedro, CA', latitude: 33.6179, longitude: -118.3168 },
  { id: '46224', name: 'Oceanside Offshore, CA', latitude: 33.1808, longitude: -117.475 },
  { id: '46225', name: 'Torrey Pines Outer, CA', latitude: 32.93, longitude: -117.392 },
  { id: '46229', name: 'Umpqua Offshore, OR', latitude: 43.7707, longitude: -124.5535 },
  { id: '46232', name: 'Point Loma South, CA', latitude: 32.5175, longitude: -117.4253 },
  { id: '46236', name: 'Monterey Canyon Outer, CA', latitude: 36.7592, longitude: -121.9503 },
  { id: '46239', name: 'Point Sur, CA', latitude: 36.3417, longitude: -122.1097 },
  { id: '46243', name: 'Clatsop Spit, OR', latitude: 46.2152, longitude: -124.1287 },
  { id: '46244', name: 'Humboldt Bay, North Spit, CA', latitude: 40.8957, longitude: -124.358 },
  { id: '46248', name: 'Astoria Canyon, OR', latitude: 46.1333, longitude: -124.6443 },
  { id: '46251', name: 'Santa Cruz Basin, CA', latitude: 33.7685, longitude: -119.563 },
  { id: '46253', name: 'San Pedro South, CA', latitude: 33.5777, longitude: -118.182 },
  { id: '46254', name: 'Scripps Nearshore, CA', latitude: 32.8678, longitude: -117.2667 },
  { id: '46256', name: 'Long Beach Channel, CA', latitude: 33.7003, longitude: -118.2007 },
  { id: '46258', name: 'Mission Bay West, CA', latitude: 32.7495, longitude: -117.4985 },
  { id: '46267', name: 'Angeles Point, WA', latitude: 48.1725, longitude: -123.6072 },
  { id: '46268', name: 'Topanga Nearshore, CA', latitude: 34.0222, longitude: -118.5783 },
  { id: '46274', name: 'Leucadia Nearshore, CA', latitude: 33.0621, longitude: -117.3141 },
  { id: '46275', name: 'Red Beach Nearshore, CA', latitude: 33.2908, longitude: -117.5015 },
  { id: '46277', name: 'Green Beach Offshore, CA', latitude: 33.3364, longitude: -117.6586 },
  { id: '46278', name: 'Tillamook Bay South Jetty, OR', latitude: 45.5615, longitude: -123.9903 },
  { id: '46285', name: 'Capistrano Beach Nearshore, CA', latitude: 33.4452, longitude: -117.6802 },
];
