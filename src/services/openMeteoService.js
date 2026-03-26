const OPEN_METEO_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

export async function fetchOpenMeteoForecast(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'visibility',
      'cloud_cover',
      'cloud_cover_low',
      'cloud_cover_mid',
      'cloud_cover_high',
      'precipitation_probability',
      'precipitation',
      'windspeed_10m',
      'winddirection_10m',
      'surface_pressure'
    ].join(','),
    timezone: 'auto'
  });

  const response = await fetch(`${OPEN_METEO_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Unable to fetch Open-Meteo data.');
  }
  return response.json();
}
