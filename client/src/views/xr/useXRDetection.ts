import { useState, useEffect } from 'react';

export function useXRDetection() {
  const [supportsVR, setSupportsVR] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const xr = navigator.xr;
    if (!xr) {
      setLoading(false);
      return;
    }

    xr.isSessionSupported('immersive-vr')
      .then(supported => setSupportsVR(supported))
      .catch(() => setSupportsVR(false))
      .finally(() => setLoading(false));
  }, []);

  return { supportsVR, loading };
}
