import { useEffect, useState } from 'react';

const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0
};

export default function useGeolocation() {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      setLoading(false);
      return undefined;
    }

    // Track location updates so the map can stay current if the user moves.
    const watchId = navigator.geolocation.watchPosition(
      (coordsEvent) => {
        setPosition(coordsEvent.coords);
        setLoading(false);
      },
      (geoError) => {
        setError(geoError.message);
        setLoading(false);
      },
      GEOLOCATION_OPTIONS
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { position, error, loading };
}
