'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import styles from '@/styles/aviso.module.css';

// Cambiar el ID cuando haya un aviso nuevo: todas las clientas lo vuelven a ver.
const AVISO_ID = 'aviso_precios_2026_11';
const AVISO_IMG = '/images/aviso-precios-nov.jpeg';
// Segundos que el botón queda bloqueado para asegurarnos de que lo lean.
const READ_SECONDS = 4;

export default function AvisoModal() {
  const [open, setOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(READ_SECONDS);

  useEffect(() => {
    let accepted = false;
    try {
      accepted = localStorage.getItem(AVISO_ID) !== null;
    } catch {
      // sin storage: lo mostramos igual
    }
    if (!accepted) {
      requestAnimationFrame(() => setOpen(true));
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [open, secondsLeft]);

  const handleAccept = () => {
    try {
      localStorage.setItem(AVISO_ID, new Date().toISOString());
    } catch {
      // ignore storage errors
    }
    setOpen(false);
  };

  if (!open) return null;

  const locked = secondsLeft > 0;

  return (
    <div
      className={styles.overlay}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="aviso-title"
      aria-describedby="aviso-desc"
    >
      <div className={styles.card}>
        <div className={styles.imageWrap}>
          <Image
            src={AVISO_IMG}
            alt="Aviso importante: a partir del 1 de noviembre se actualiza la lista de precios"
            width={1024}
            height={1536}
            priority
            className={styles.image}
          />
        </div>

        <div className={styles.footer}>
          <h2 id="aviso-title" className={styles.title}>Aviso importante</h2>
          <p id="aviso-desc" className={styles.text}>
            A partir del <strong>1 de noviembre</strong> se actualiza la lista de precios.
          </p>
          <button
            onClick={handleAccept}
            disabled={locked}
            className={styles.acceptBtn}
            style={{ '--read-seconds': `${READ_SECONDS}s` }}
          >
            <span className={styles.progress} aria-hidden="true" />
            <span className={styles.btnLabel}>
              {locked ? (
                `Leé el aviso… ${secondsLeft}`
              ) : (
                <>
                  <Check size={16} /> Leí el aviso y acepto
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
