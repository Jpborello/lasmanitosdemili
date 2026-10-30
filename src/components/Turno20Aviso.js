'use client';

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import styles from '@/styles/turno20.module.css';
import { useLiveSettings } from '@/hooks/useLiveSettings';
import { parseTurno20Dates, upcomingTurno20Dates, formatTurno20Dates } from '@/lib/turno20';

const DISMISS_KEY = 'turno20_aviso_cerrado';

function readDismissed() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

// Aviso flotante para las clientas mientras el turno especial de 20hs esté prendido.
// Si lo cierran no vuelve a salir, salvo que Mili cambie los días o el texto.
export default function Turno20Aviso() {
  const settings = useLiveSettings();
  const [dismissed, setDismissed] = useState(readDismissed);

  const dates = upcomingTurno20Dates(settings?.slot_20_enabled, parseTurno20Dates(settings?.slot_20_dates));
  if (dates.length === 0) return null;

  const customText = (settings.slot_20_notice || '').trim();
  const signature = `${dates.join(',')}|${customText}`;
  if (dismissed === signature) return null;

  const close = () => {
    try {
      localStorage.setItem(DISMISS_KEY, signature);
    } catch {
      // sin storage: se cierra solo por esta visita
    }
    setDismissed(signature);
  };

  return (
    <div className={styles.aviso} role="status">
      <span className={styles.icon}><Sparkles size={18} /></span>
      <div className={styles.body}>
        <strong className={styles.title}>¡Nuevo horario de 20:00 hs!</strong>
        <p className={styles.text}>
          {customText || `Disponible el ${formatTurno20Dates(dates)}.`}
        </p>
        <a href="#turnos" className={styles.cta} onClick={close}>Reservar ahora</a>
      </div>
      <button type="button" className={styles.close} onClick={close} aria-label="Cerrar aviso">
        <X size={16} />
      </button>
    </div>
  );
}
