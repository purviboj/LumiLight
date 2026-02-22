const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';

function normalizeZip(query) {
  const value = query.trim();
  if (/^\d{5}$/.test(value)) return value;
  if (/^\d{5}-\d{4}$/.test(value)) return value.slice(0, 5);
  return null;
}

export async function geocodeQuery(query, signal) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new Error('Enter a ZIP code or location first.');
  }

  const zip = normalizeZip(trimmedQuery);
  const searchQuery = zip ? `${zip}, USA` : trimmedQuery;

  const params = new URLSearchParams({
    q: searchQuery,
    format: 'jsonv2',
    limit: '1',
    addressdetails: '1'
  });

  const response = await fetch(`${NOMINATIM_ENDPOINT}?${params.toString()}`, {
    method: 'GET',
    signal
  });

  if (!response.ok) {
    throw new Error('Unable to geocode this location right now. Please try again.');
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('No location match found. Try a nearby city or full place name.');
  }

  const [match] = results;
  const latitude = Number.parseFloat(match.lat);
  const longitude = Number.parseFloat(match.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Location lookup returned invalid coordinates.');
  }

  return {
    latitude,
    longitude,
    displayName: match.display_name || trimmedQuery
  };
}
