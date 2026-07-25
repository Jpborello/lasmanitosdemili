'use client';

import { Calendar, Clock, Phone, Trash2, RefreshCw } from 'lucide-react';
import styles from '@/styles/admin.module.css';

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

export default function AppointmentsTab({
  appointments,
  selectedDate,
  setSelectedDate,
  viewMode,
  setViewMode,
  loadingData,
  fetchAppointments,
  handleCancelAppointment,
  actionLoading,
}) {
  const getWhatsAppLink = (phone, name, date, time) => {
    const cleanedPhone = phone.replace(/\D/g, '');
    const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
    const message = encodeURIComponent(
      `¡Hola ${name}! Te escribo de Mili Nails para confirmarte y recordarte tu turno del día ${formattedDate} a las ${time} hs.`
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

  return (
    <div className={`${styles.bookingsCard} glass-card-gold`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '25px' }}>
        <h2 className={styles.sectionTitle} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
          {viewMode === 'day' ? 'Turnos del Día' : 'Todos los Próximos Turnos'}
        </h2>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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

      {loadingData ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '50px 0' }}>
          <div className="loader"></div>
        </div>
      ) : appointments.length === 0 ? (
        <div className={styles.emptyState}>
          <Calendar size={40} style={{ color: 'var(--accent-rose)', marginBottom: '10px' }} />
          <p>No hay turnos agendados para este periodo.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {appointments.map((appt) => (
            <div key={appt.id} className={styles.appointmentItem}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span className={styles.apptTime}>
                    <Clock size={12} style={{ marginRight: '4px' }} />
                    {appt.appointment_time} hs
                  </span>
                  
                  {viewMode === 'all' && (
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
