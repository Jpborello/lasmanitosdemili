'use client';

import { useState } from 'react';
import styles from '@/styles/admin.module.css';

// "Pausar la web": las clientas ven un cartel de "volvemos pronto" y los turnos
// se toman por WhatsApp. El panel de admin sigue funcionando normal.
export default function PausaSection({ enabled, returnText, actionLoading, onToggle, onSaveReturnText }) {
  const [localReturn, setLocalReturn] = useState(returnText || '');
  const [prevReturn, setPrevReturn] = useState(returnText);

  if (returnText !== prevReturn) {
    setPrevReturn(returnText);
    setLocalReturn(returnText || '');
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveReturnText(localReturn.trim());
  };

  return (
    <div className={`${styles.pausaBox} ${enabled ? styles.pausaBoxOn : ''}`}>
      <div className={styles.configItem} style={{ borderBottom: 'none', padding: 0 }}>
        <div className={styles.configLabel}>
          <span className={styles.configName}>
            Pausar la web {enabled && <span className={styles.pausaBadge}>En pausa</span>}
          </span>
          <span className={styles.configDesc}>
            {enabled
              ? 'Las clientas ven el cartel de "volvemos pronto" y piden turno por WhatsApp.'
              : 'Muestra un cartel de "volvemos pronto" y deja los turnos solo por WhatsApp.'}
          </span>
        </div>
        <label className={styles.switch}>
          <input type="checkbox" checked={enabled} onChange={onToggle} disabled={actionLoading} />
          <span className={styles.slider}></span>
        </label>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <input
          type="text"
          maxLength={120}
          placeholder='Opcional: "Volvemos el 1 de diciembre"'
          value={localReturn}
          onChange={(e) => setLocalReturn(e.target.value)}
          disabled={actionLoading}
          style={{
            flexGrow: 1,
            minWidth: 0,
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            fontSize: '0.85rem',
          }}
        />
        <button
          type="submit"
          className="btn-primary"
          style={{ padding: '8px 14px', fontSize: '0.8rem' }}
          disabled={actionLoading || localReturn.trim() === (returnText || '')}
        >
          Guardar
        </button>
      </form>
    </div>
  );
}
