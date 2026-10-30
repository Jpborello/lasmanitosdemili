'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from '@/styles/admin.module.css';
import { todayAR, upcomingTurno20Dates, formatTurno20Dates } from '@/lib/turno20';

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Turno especial de las 20:00 hs: interruptor general + días marcados a mano
// (lunes a sábado) + texto opcional del aviso que ven las clientas.
export default function Turno20Section({
  enabled,
  dates,
  notice,
  actionLoading,
  onToggle,
  onToggleDate,
  onSaveNotice,
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [localNotice, setLocalNotice] = useState(notice || '');
  const [prevNotice, setPrevNotice] = useState(notice);

  if (notice !== prevNotice) {
    setPrevNotice(notice);
    setLocalNotice(notice || '');
  }

  const today = todayAR();
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const isCurrentMonth = toDateStr(viewMonth).slice(0, 7) <= today.slice(0, 7);

  // Grilla del mes empezando en lunes
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const monthName = viewMonth.toLocaleDateString('es-AR', { month: 'long' });
  const monthLabel = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${year}`;

  const upcoming = upcomingTurno20Dates(true, dates);
  const autoNotice = upcoming.length > 0
    ? `¡Nuevo horario de 20:00 hs! Disponible el ${formatTurno20Dates(upcoming)}.`
    : '';

  const handleNoticeSubmit = (e) => {
    e.preventDefault();
    onSaveNotice(localNotice.trim());
  };

  return (
    <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
      <div className={styles.configItem}>
        <div className={styles.configLabel}>
          <span className={styles.configName}>Turno 20:00 hs (especial)</span>
          <span className={styles.configDesc}>
            Prendelo y marcá los días en que lo ofrecés (lunes a sábado). Las clientas lo ven al instante, con un aviso.
          </span>
        </div>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={onToggle}
            disabled={actionLoading}
          />
          <span className={styles.slider}></span>
        </label>
      </div>

      <div className={`${styles.t20Calendar} ${!enabled ? styles.t20Disabled : ''}`}>
        <div className={styles.t20Header}>
          <button
            type="button"
            className={styles.t20Nav}
            onClick={() => setViewMonth(new Date(year, month - 1, 1))}
            disabled={isCurrentMonth}
            aria-label="Mes anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <span className={styles.t20Month}>
            {monthLabel}
          </span>
          <button
            type="button"
            className={styles.t20Nav}
            onClick={() => setViewMonth(new Date(year, month + 1, 1))}
            aria-label="Mes siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className={styles.t20Grid}>
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={i} className={styles.t20Weekday}>{label}</span>
          ))}
          {cells.map((date, i) => {
            if (!date) return <span key={`empty-${i}`} />;
            const dateStr = toDateStr(date);
            const isSunday = date.getDay() === 0;
            const isPast = dateStr < today;
            const isMarked = dates.includes(dateStr);
            let className = styles.t20Day;
            if (isMarked) className += ` ${styles.t20DayMarked}`;
            return (
              <button
                key={dateStr}
                type="button"
                className={className}
                onClick={() => onToggleDate(dateStr)}
                disabled={actionLoading || isSunday || isPast}
                title={isMarked ? 'Quitar turno de 20hs' : 'Agregar turno de 20hs'}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '10px' }}>
        {upcoming.length > 0
          ? <>Días marcados: <strong>{formatTurno20Dates(upcoming)}</strong></>
          : <span style={{ fontStyle: 'italic' }}>Todavía no marcaste ningún día.</span>}
        {upcoming.length > 0 && !enabled && (
          <span style={{ color: 'var(--error)', marginLeft: '4px' }}>(apagado: las clientas no lo ven)</span>
        )}
      </p>

      <form onSubmit={handleNoticeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Texto del aviso (opcional). Si lo dejás vacío se arma solo con los días marcados.
        </label>
        <textarea
          rows={2}
          maxLength={300}
          placeholder={autoNotice || '¡Nuevo horario de 20:00 hs!'}
          value={localNotice}
          onChange={(e) => setLocalNotice(e.target.value)}
          disabled={actionLoading}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            fontSize: '0.85rem',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
        <button
          type="submit"
          className="btn-primary"
          style={{ width: '100%', padding: '8px', fontSize: '0.8rem' }}
          disabled={actionLoading || localNotice.trim() === (notice || '')}
        >
          Guardar texto del aviso
        </button>
      </form>
    </div>
  );
}
