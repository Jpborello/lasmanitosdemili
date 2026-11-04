'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import styles from '@/styles/admin.module.css';
import { todayAR } from '@/lib/turno20';
import { SUNDAY_TIME_OPTIONS, SATURDAY_TIMES, sundayTimesFor, sundayDates } from '@/lib/domingos';

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatSunday(dateStr) {
  const text = new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Domingos especiales: Mili toca un domingo en el calendario y elige sus horarios.
// Un domingo sin horarios queda cerrado, como siempre.
export default function DomingosSection({ slots, actionLoading, onSetTimes }) {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState(null);

  const today = todayAR();
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const isCurrentMonth = toDateStr(viewMonth).slice(0, 7) <= today.slice(0, 7);
  const monthName = viewMonth.toLocaleDateString('es-AR', { month: 'long' });
  const monthLabel = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${year}`;

  // Grilla del mes empezando en lunes
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const upcoming = sundayDates(slots).filter(d => d >= today);
  const selectedTimes = selected ? sundayTimesFor(slots, selected) : [];

  const toggleTime = (time) => {
    const next = selectedTimes.includes(time)
      ? selectedTimes.filter(t => t !== time)
      : [...selectedTimes, time].sort();
    onSetTimes(selected, next);
  };

  return (
    <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
      <div className={styles.configLabel}>
        <span className={styles.configName}>Domingos especiales</span>
        <span className={styles.configDesc}>
          Tocá un domingo y elegí sus horarios. Los domingos sin horarios siguen cerrados.
        </span>
      </div>

      <div className={styles.t20Calendar}>
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
          <span className={styles.t20Month}>{monthLabel}</span>
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
            const hasTimes = isSunday && sundayTimesFor(slots, dateStr).length > 0;
            let className = styles.t20Day;
            if (hasTimes) className += ` ${styles.t20DayMarked}`;
            if (selected === dateStr) className += ` ${styles.t20DaySelected}`;
            return (
              <button
                key={dateStr}
                type="button"
                className={className}
                onClick={() => setSelected(selected === dateStr ? null : dateStr)}
                disabled={!isSunday || isPast}
                title={isSunday ? 'Elegir horarios de este domingo' : undefined}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div style={{ marginTop: '12px' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
            {formatSunday(selected)}
          </p>
          <div className={styles.timeChips}>
            {SUNDAY_TIME_OPTIONS.map(time => (
              <button
                key={time}
                type="button"
                className={`${styles.timeChip} ${selectedTimes.includes(time) ? styles.timeChipOn : ''}`}
                onClick={() => toggleTime(time)}
                disabled={actionLoading}
              >
                {time}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              onClick={() => onSetTimes(selected, SATURDAY_TIMES)}
              disabled={actionLoading}
            >
              Usar horario de sábado
            </button>
            {selectedTimes.length > 0 && (
              <button
                type="button"
                className={styles.logoutBtn}
                style={{ padding: '6px 12px', fontSize: '0.75rem', border: '1px solid var(--error)', color: 'var(--error)' }}
                onClick={() => onSetTimes(selected, [])}
                disabled={actionLoading}
              >
                Cerrar este domingo
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: '14px' }}>
        {upcoming.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {upcoming.map(dateStr => (
              <div
                key={dateStr}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '6px 10px', backgroundColor: 'rgba(220, 174, 150, 0.12)', border: '1px solid rgba(220, 174, 150, 0.35)', borderRadius: 'var(--radius-sm)' }}
              >
                <button
                  type="button"
                  onClick={() => setSelected(dateStr)}
                  style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit', fontSize: '0.85rem' }}
                >
                  <strong>{formatSunday(dateStr)}</strong>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {sundayTimesFor(slots, dateStr).join(' · ')} hs
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onSetTimes(dateStr, [])}
                  disabled={actionLoading}
                  style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="Cerrar este domingo"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No hay domingos habilitados.
          </p>
        )}
      </div>
    </div>
  );
}
