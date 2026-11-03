'use client';

import { useState, useEffect } from 'react';
import { Lock, MessageCircle } from 'lucide-react';
import styles from '@/styles/pausa.module.css';
import { MILI_WHATSAPP_NUMBER } from '@/lib/constants';
import { useLiveSettings } from '@/hooks/useLiveSettings';

const WHATSAPP_URL = `https://wa.me/${MILI_WHATSAPP_NUMBER}?text=${encodeURIComponent('¡Hola Mili! Quería pedir un turno 💅')}`;

// Cartel que ven las clientas mientras Mili tiene la web en pausa.
export default function PausaScreen({ returnText }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const liveSettings = useLiveSettings();

  // Si Mili saca la pausa con la página abierta, volvemos a mostrar la web
  useEffect(() => {
    if (liveSettings && liveSettings.maintenance_enabled === false) {
      window.location.reload();
    }
  }, [liveSettings]);

  // Mili/Sami: igual que en la web normal, si abre la app va directo a su panel
  useEffect(() => {
    let isClientExplicit = false;
    let preferredView = null;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'client') sessionStorage.setItem('view_as_client', 'true');
      isClientExplicit = params.get('view') === 'client' || sessionStorage.getItem('view_as_client') === 'true';
      preferredView = localStorage.getItem('admin_preferred_view');
    } catch {}

    fetch('/api/admin/login')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated) return;
        if (!isClientExplicit && preferredView === 'admin') {
          window.location.replace('/admin');
          return;
        }
        setIsAdmin(true);
      })
      .catch(() => {});
  }, []);

  return (
    <div className={styles.wrap} data-pausa>
      {isAdmin && (
        <div className={styles.adminBar}>
          <span>La web está en pausa · así la ven tus clientas</span>
          <a href="/admin">Volver a mi panel</a>
        </div>
      )}

      <div className={styles.card}>
        <img src="/logo.jpg" alt="Las Manitos de Mili" className={styles.logo} />
        <span className={styles.eyebrow}>Las Manitos de Mili</span>
        <h1 className={styles.title}>
          Estamos preparando algo <em>lindo</em> para vos ✨
        </h1>
        <p className={styles.text}>
          Nos tomamos un tiempito para renovarnos y atenderte mejor.
        </p>
        {returnText && <p className={styles.returnText}>{returnText}</p>}

        <div className={styles.whatsBox}>
          <p className={styles.whatsText}>
            Por el momento, <strong>los turnos se piden por WhatsApp</strong>.
          </p>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={styles.whatsBtn}>
            <MessageCircle size={20} />
            Escribime por WhatsApp
          </a>
          <p className={styles.small}>¿Ya tenías un turno? Escribime y lo vemos juntas.</p>
        </div>

        <a
          href="https://instagram.com/las_manitosde_mili"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.insta}
        >
          Mientras tanto, seguinos en Instagram @las_manitosde_mili
        </a>
      </div>

      <a href="/admin" className={styles.lock} aria-label="Panel de Administración" title="Panel de Administración">
        <Lock size={14} />
      </a>
    </div>
  );
}
