const OPEN_WEATHER_CURRENT = 'https://api.openweathermap.org/data/2.5/weather';
const OPEN_WEATHER_FORECAST = 'https://api.openweathermap.org/data/2.5/forecast';

function getApiKey() {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OpenWeather API key. Set VITE_OPENWEATHER_API_KEY in your .env file.');
  }
  return apiKey;
}

export async function fetchOpenWeatherCurrent(lat, lon) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    units: 'metric',
    appid: getApiKey()
  });

  const response = await fetch(`${OPEN_WEATHER_CURRENT}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Unable to fetch OpenWeather current conditions.');
  }
  return response.json();
}

export async function fetchOpenWeatherForecast(lat, lon) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    units: 'metric',
    appid: getApiKey()
  });

  const response = await fetch(`${OPEN_WEATHER_FORECAST}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Unable to fetch OpenWeather forecast.');
  }
  return response.json();
}
