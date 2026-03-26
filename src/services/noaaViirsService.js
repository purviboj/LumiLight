const VIIRS_IMAGE_SERVER =
  'https://gis.ngdc.noaa.gov/arcgis/rest/services/NPP_VIIRS_DNB/Nightly_Radiance/ImageServer';

export async function fetchViirsRadiance(lat, lon) {
  const params = new URLSearchParams({
    f: 'json',
    geometryType: 'esriGeometryPoint',
    geometry: `${lon},${lat}`,
    sr: '4326',
    returnGeometry: 'false',
    // Required by ArcGIS ImageServer identify for raster sampling
    imageDisplay: '400,400,96',
    mapExtent: `${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}`,
    mosaicRule: '',
    renderingRule: ''
  });

  const response = await fetch(`${VIIRS_IMAGE_SERVER}/identify?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Unable to fetch VIIRS radiance data.');
  }
  const payload = await response.json();
  if (!payload) {
    throw new Error('VIIRS response empty.');
  }

  if (typeof payload.value === 'number') return payload.value;
  if (typeof payload.value === 'string' && payload.value.trim() !== '') {
    const parsed = Number.parseFloat(payload.value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (Array.isArray(payload.properties?.Values) && typeof payload.properties.Values[0] === 'number') {
    return payload.properties.Values[0];
  }

  throw new Error('VIIRS radiance value not found at this location.');
}
