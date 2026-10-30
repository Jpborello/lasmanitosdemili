'use client';

import { useState, useEffect } from 'react';

const REFRESH_MS = 30000;

// Configuración pública (horarios, bloqueos, turno de 20hs...) siempre fresca:
// se vuelve a pedir cada 30s y cada vez que la clienta vuelve a la pestaña/app,
// así lo que Mili cambia en el admin le aparece sin tener que recargar.
export function useLiveSettings() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetch('/api/admin/settings', { cache: 'no-store' })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (!cancelled && data && !data.error) setSettings(data);
        })
        .catch(err => console.error('Error fetching settings:', err));
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };

    load();
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, REFRESH_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', load);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', load);
    };
  }, []);

  return settings;
}
