'use client';

import { useState } from 'react';
import { Calendar, Clock, Phone, Trash2, RefreshCw, UserX, RotateCcw, BadgeCheck, Search } from 'lucide-react';
import styles from '@/styles/admin.module.css';

const PENDING_STATUSES = ['pending_deposit', 'pending_payment'];

const SERVICES_MAP = {
  semi_mani: 'Semipermanente (Manicura)',
  kapping: 'Kapping Poligel',
  soft_gel: 'Soft Gel',
  esculpidas: 'Esculpidas',
  retirado_mani: 'Retirado final (Manicura)',
  semi_pedi: 'Semipermanente (Pedicura)',
  pedi_completa: 'Pedicura Completa (Exfoliación + Hidratación)',
  pedi_completa_semi: 'Pedicura Completa + Semipermanente',
};

const STATUS_LABELS = {
  confirmed: { label: 'Confirmado', bg: 'rgba(136, 167, 131, 0.15)', color: 'var(--success)' },
  pending_payment: { label: 'Pendiente de pago', bg: 'rgba(197, 168, 128, 0.15)', color: 'var(--accent-gold)' },
  pending_deposit: { label: 'Seña pendiente de aprobación', bg: 'rgba(197, 168, 128, 0.15)', color: 'var(--accent-gold)' },
  no_show: { label: 'No se presentó', bg: 'rgba(203, 120, 112, 0.15)', color: 'var(--error)' },
};

export default function AppointmentsTab({
  appointments,
  selectedDate,
  setSelectedDate,
  viewMode,
  setViewMode,
  loadingData,
  fetchAppointments,
  handleCancelAppointment,
  handleMarkNoShow,
  handleApproveDeposit,
  actionLoading,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const getWhatsAppLink = (phone, name, date, time) => {
    const cleanedPhone = phone.replace(/\D/g, '');
    const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
    const message = encodeURIComponent(
      `¡Hola ${name}! Te escribo de Las Manitos de Mili para confirmarte y recordarte tu turno del día ${formattedDate} a las ${time} hs.`
    );
    return `https://wa.me/${cleanedPhone}?text=${message}`;
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Filtrar por estado (solo "Por Confirmar") y por búsqueda de nombre/teléfono
  const visibleAppointments = appointments
    .filter(appt => viewMode !== 'pending' || PENDING_STATUSES.includes(appt.status))
    .filter(appt => {
      if (viewMode === 'day' || !searchTerm.trim()) return true;
      const term = searchTerm.trim().toLowerCase();
      const termDigits = term.replace(/\D/g, '');
      const nameMatch = (appt.client_name || '').toLowerCase().includes(term);
      const phoneMatch = termDigits.length > 0 && (appt.client_phone || '').includes(termDigits);
      return nameMatch || phoneMatch;
    });

  const titles = {
    day: 'Turnos del Día',
    pending: 'Turnos por Confirmar',
  };

  return (
    <div className={`${styles.bookingsCard} glass-card-gold`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '25px' }}>
        <h2 className={styles.sectionTitle} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
          {titles[viewMode] || 'Todos los Próximos Turnos'}
        </h2>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Selector de modo de vista */}
          <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '20px', overflow: 'hidden' }}>
            <button
              type="button"
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                backgroundColor: viewMode === 'day' ? 'var(--accent-rose)' : 'var(--white)',
                color: viewMode === 'day' ? 'var(--white)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => setViewMode('day')}
            >
              Día
            </button>
            <button
              type="button"
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                backgroundColor: viewMode === 'all' ? 'var(--accent-rose)' : 'var(--white)',
                color: viewMode === 'all' ? 'var(--white)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => setViewMode('all')}
            >
              Todos los Próximos
            </button>
            <button
              type="button"
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                backgroundColor: viewMode === 'pending' ? 'var(--accent-rose)' : 'var(--white)',
                color: viewMode === 'pending' ? 'var(--white)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => setViewMode('pending')}
            >
              Por Confirmar
            </button>
          </div>

          {/* Actualizar */}
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '8px 12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={fetchAppointments}
            disabled={loadingData}
            title="Actualizar listado"
          >
            <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {viewMode === 'day' && (
        <div className="formGroup" style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label className="label" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-dark)' }}>
            Seleccionar Fecha:
          </label>
          <input
            type="date"
            className="input"
            style={{ width: 'auto', padding: '8px 12px' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={loadingData}
          />
        </div>
      )}

      {viewMode !== 'day' && (
        <div style={{ position: 'relative', marginBottom: '25px', maxWidth: '340px' }}>
          <input
            type="text"
            className="input"
            style={{ paddingLeft: '35px', width: '100%' }}
            placeholder="Buscar por nombre o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
      )}

      {loadingData ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '50px 0' }}>
          <div className="loader"></div>
        </div>
      ) : visibleAppointments.length === 0 ? (
        <div className={styles.emptyState}>
          <Calendar size={40} style={{ color: 'var(--accent-rose)', marginBottom: '10px' }} />
          <p>
            {viewMode === 'pending'
              ? 'No hay turnos esperando confirmación de seña.'
              : searchTerm.trim()
              ? 'No se encontraron turnos que coincidan con la búsqueda.'
              : 'No hay turnos agendados para este periodo.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {visibleAppointments.map((appt) => (
            <div key={appt.id} className={styles.appointmentItem}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span className={styles.apptTime}>
                    <Clock size={12} style={{ marginRight: '4px' }} />
                    {appt.appointment_time} hs
                  </span>
                  
                  {viewMode !== 'day' && (
                    <span className={styles.apptDate}>
                      <Calendar size={12} style={{ marginRight: '4px' }} />
                      {new Date(`${appt.appointment_date}T00:00:00`).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  )}
                  
                  <span className={styles.clientName}>{appt.client_name}</span>

                  {appt.status && appt.status !== 'confirmed' && STATUS_LABELS[appt.status] && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontWeight: 600,
                        backgroundColor: STATUS_LABELS[appt.status].bg,
                        color: STATUS_LABELS[appt.status].color,
                      }}
                    >
                      {STATUS_LABELS[appt.status].label}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Servicio: <strong style={{ color: 'var(--text-dark)' }}>{SERVICES_MAP[appt.service] || appt.service}</strong>
                  {appt.price > 0 && (
                    <span style={{ marginLeft: '12px', color: 'var(--accent-gold)', fontWeight: 600 }}>
                      Valor: {formatMoney(appt.price)}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '15px', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span>Tel: {appt.client_phone}</span>
                  {appt.client_email && <span>Email: {appt.client_email}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {/* Botón WhatsApp */}
                <a
                  href={getWhatsAppLink(appt.client_phone, appt.client_name, appt.appointment_date, appt.appointment_time)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contactLink}
                  title="Enviar recordatorio de WhatsApp"
                >
                  <Phone size={16} /> Remind
                </a>

                {/* Botón Aprobar seña (solo para turnos con seña manual pendiente) */}
                {appt.status === 'pending_deposit' && (
                  <button
                    type="button"
                    className={styles.noShowBtn}
                    onClick={() => handleApproveDeposit(appt.id)}
                    disabled={actionLoading}
                    title="Confirmar que la seña fue recibida y aprobar el turno"
                  >
                    <BadgeCheck size={16} />
                  </button>
                )}

                {/* Botón No-show */}
                {appt.status === 'no_show' ? (
                  <button
                    type="button"
                    className={styles.noShowBtn}
                    onClick={() => handleMarkNoShow(appt.id, false)}
                    disabled={actionLoading}
                    title="Deshacer: marcar como confirmado de nuevo"
                  >
                    <RotateCcw size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.noShowBtn}
                    onClick={() => handleMarkNoShow(appt.id, true)}
                    disabled={actionLoading}
                    title="Marcar que la clienta no se presentó"
                  >
                    <UserX size={16} />
                  </button>
                )}

                {/* Botón Cancelar */}
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => handleCancelAppointment(appt.id)}
                  disabled={actionLoading}
                  title="Cancelar turno"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
