'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import styles from '@/styles/admin.module.css';

import { useEffect } from 'react';

export default function SettingsTab({
  enable18Weekday,
  blockedWeekdays,
  blockedDates,
  blockedSlots,
  mpEnabled,
  mpAccessToken,
  mpPublicKey,
  mpDepositAmount,
  actionLoading,
  onToggle18,
  onToggleWeekday,
  onAddBlockedDate,
  onRemoveBlockedDate,
  onAddBlockedSlot,
  onRemoveBlockedSlot,
  onSaveMercadoPago,
}) {
  const [dateToBlock, setDateToBlock] = useState('');
  const [slotDateToBlock, setSlotDateToBlock] = useState('');
  const [slotTimeToBlock, setSlotTimeToBlock] = useState('08:00');

  const [localMpEnabled, setLocalMpEnabled] = useState(mpEnabled || false);
  const [localMpAccessToken, setLocalMpAccessToken] = useState(mpAccessToken || '');
  const [localMpPublicKey, setLocalMpPublicKey] = useState(mpPublicKey || '');
  const [localMpDepositAmount, setLocalMpDepositAmount] = useState(mpDepositAmount || 2000);

  useEffect(() => {
    if (mpEnabled !== undefined) setLocalMpEnabled(mpEnabled);
  }, [mpEnabled]);

  useEffect(() => {
    if (mpAccessToken !== undefined) setLocalMpAccessToken(mpAccessToken);
  }, [mpAccessToken]);

  useEffect(() => {
    if (mpPublicKey !== undefined) setLocalMpPublicKey(mpPublicKey);
  }, [mpPublicKey]);

  useEffect(() => {
    if (mpDepositAmount !== undefined) setLocalMpDepositAmount(mpDepositAmount);
  }, [mpDepositAmount]);

  const handleDateSubmit = (e) => {
    e.preventDefault();
    if (!dateToBlock) return;
    onAddBlockedDate(dateToBlock);
    setDateToBlock('');
  };

  const handleSlotSubmit = (e) => {
    e.preventDefault();
    if (!slotDateToBlock || !slotTimeToBlock) return;
    onAddBlockedSlot(slotDateToBlock, slotTimeToBlock);
    setSlotDateToBlock('');
  };

  const handleMpSubmit = (e) => {
    e.preventDefault();
    onSaveMercadoPago({
      mp_enabled: localMpEnabled,
      mp_access_token: localMpAccessToken,
      mp_public_key: localMpPublicKey,
      mp_deposit_amount: parseInt(localMpDepositAmount, 10) || 2000
    });
  };

  return (
    <div className={`${styles.configCard} glass-card`}>
      <h2 className={styles.sectionTitle}>Ajustes de Turnos</h2>
      
      <div className={styles.configItem}>
        <div className={styles.configLabel}>
          <span className={styles.configName}>Turno 18:00 hs (Lun-Vie)</span>
          <span className={styles.configDesc}>Habilita o deshabilita este último turno para los días de semana.</span>
        </div>
        <label className={styles.switch}>
          <input 
            type="checkbox" 
            checked={enable18Weekday} 
            onChange={onToggle18}
            disabled={actionLoading}
          />
          <span className={styles.slider}></span>
        </label>
      </div>

      <div style={{ marginTop: '15px' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Horarios del Estudio
        </h3>
        <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li>• Lunes a Viernes: 8:00, 10:00, 14:00, 16:00 y {enable18Weekday ? '18:00' : '18:00 (Inactivo)'} hs.</li>
          <li>• Sábados: 8:00, 10:00, 12:00, 14:00, 16:00 y 18:00 hs.</li>
          <li>• Domingos: Cerrado.</li>
        </ul>
      </div>

      {/* Días Habilitados */}
      <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Días Habilitados
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { label: 'Lunes', val: 1 },
            { label: 'Martes', val: 2 },
            { label: 'Miércoles', val: 3 },
            { label: 'Jueves', val: 4 },
            { label: 'Viernes', val: 5 },
            { label: 'Sábados', val: 6 },
            { label: 'Domingos', val: 0 },
          ].map(day => {
            const isBlocked = blockedWeekdays.includes(day.val);
            return (
              <label key={day.val} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!isBlocked}
                  onChange={() => onToggleWeekday(day.val)}
                  disabled={actionLoading}
                />
                <span>
                  {day.label} {isBlocked && <span style={{ fontSize: '0.75rem', color: 'var(--error)', marginLeft: '4px' }}>(Inactivo)</span>}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Bloqueo de Fechas Completas */}
      <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Bloquear Fechas Completas
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Ideal para feriados, vacaciones o días especiales no laborables.
        </p>

        <form onSubmit={handleDateSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
          <input
            type="date"
            required
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              fontSize: '0.85rem',
              flexGrow: 1
            }}
            value={dateToBlock}
            onChange={(e) => setDateToBlock(e.target.value)}
            disabled={actionLoading}
          />
          <button
            type="submit"
            className={styles.logoutBtn}
            style={{ padding: '8px 15px', fontSize: '0.8rem', border: '1px solid var(--accent-rose)', color: 'var(--accent-rose)' }}
            disabled={actionLoading}
          >
            Bloquear
          </button>
        </form>

        {blockedDates.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto', paddingRight: '5px' }}>
            {[...blockedDates].sort().map(dateStr => (
              <div key={dateStr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'rgba(203, 120, 112, 0.05)', border: '1px solid rgba(203, 120, 112, 0.15)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                  {new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveBlockedDate(dateStr)}
                  disabled={actionLoading}
                  style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="Desbloquear fecha"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No hay fechas bloqueadas.
          </p>
        )}
      </div>

      {/* Bloqueo de Horas Específicas */}
      <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Bloquear Horas Específicas
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Bloquea un horario puntual de un día específico (ej. por turnos médicos).
        </p>
        
        <form onSubmit={handleSlotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="date"
              required
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                fontSize: '0.85rem',
                flexGrow: 1
              }}
              value={slotDateToBlock}
              onChange={(e) => setSlotDateToBlock(e.target.value)}
              disabled={actionLoading}
            />
            
            <select
              required
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                fontSize: '0.85rem',
                backgroundColor: 'var(--white)',
              }}
              value={slotTimeToBlock}
              onChange={(e) => setSlotTimeToBlock(e.target.value)}
              disabled={actionLoading}
            >
              {['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'].map(t => (
                <option key={t} value={t}>{t} hs</option>
              ))}
            </select>
          </div>
          
          <button
            type="submit"
            className={styles.logoutBtn}
            style={{ width: '100%', padding: '8px', fontSize: '0.8rem', border: '1px solid var(--accent-rose)', color: 'var(--accent-rose)' }}
            disabled={actionLoading}
          >
            Bloquear Horario
          </button>
        </form>

        {blockedSlots.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto', paddingRight: '5px' }}>
            {blockedSlots.map(slotKey => {
              const [dateStr, timeStr] = slotKey.split('_');
              return (
                <div key={slotKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'rgba(203, 120, 112, 0.05)', border: '1px solid rgba(203, 120, 112, 0.15)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                    {new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short'
                    })} - {timeStr} hs
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveBlockedSlot(slotKey)}
                    disabled={actionLoading}
                    style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title="Desbloquear horario"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No hay horarios bloqueados.
          </p>
        )}
      </div>

      {/* Integración Mercado Pago */}
      <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Integración de Mercado Pago (Cobro de Seña)
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
          Configura una seña obligatoria para que las clientas confirmen su turno realizando un pago online.
        </p>

        <form onSubmit={handleMpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Habilitar / Deshabilitar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--white)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Activar cobro de seña</span>
            <label className={styles.switch}>
              <input 
                type="checkbox" 
                checked={localMpEnabled} 
                onChange={(e) => setLocalMpEnabled(e.target.checked)}
                disabled={actionLoading}
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          {localMpEnabled && (
            <>
              {/* Access Token */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Access Token (Producción o Sandbox) *</label>
                <input 
                  type="password"
                  required
                  placeholder={mpAccessToken ? "••••••••••••••••••••••••••••••••" : "APP_USR-..."}
                  className="input"
                  style={{ width: '100%', fontSize: '0.85rem', padding: '8px 12px' }}
                  value={localMpAccessToken}
                  onChange={(e) => setLocalMpAccessToken(e.target.value)}
                  disabled={actionLoading}
                />
              </div>

              {/* Public Key */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Public Key *</label>
                <input 
                  type="text"
                  required
                  placeholder="APP_USR-..."
                  className="input"
                  style={{ width: '100%', fontSize: '0.85rem', padding: '8px 12px' }}
                  value={localMpPublicKey}
                  onChange={(e) => setLocalMpPublicKey(e.target.value)}
                  disabled={actionLoading}
                />
              </div>

              {/* Monto de la Seña */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Monto de la Seña (ARS) *</label>
                <input 
                  type="number"
                  min="50"
                  required
                  placeholder="Ej: 2000"
                  className="input"
                  style={{ width: '100%', fontSize: '0.85rem', padding: '8px 12px' }}
                  value={localMpDepositAmount}
                  onChange={(e) => setLocalMpDepositAmount(e.target.value)}
                  disabled={actionLoading}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '10px', fontSize: '0.8rem', marginTop: '5px' }}
            disabled={actionLoading}
          >
            Guardar Configuración de Pago
          </button>
        </form>
      </div>
    </div>
  );
}
