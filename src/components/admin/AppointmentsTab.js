'use client';

import { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Phone,
  Trash2,
  RefreshCw,
  UserX,
  RotateCcw,
  BadgeCheck,
  Search,
  CalendarPlus,
  X,
  PhoneOff,
  UserCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import styles from '@/styles/admin.module.css';
import { isNoPhone } from '@/lib/phone';

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

const STANDARD_SLOTS = ['08:00', '10:00', '12:00', '14:30', '16:00', '18:00'];

const STATUS_LABELS = {
  confirmed: { label: 'Confirmado', bg: 'rgba(136, 167, 131, 0.15)', color: 'var(--success)' },
  pending_payment: { label: 'Pendiente de pago', bg: 'rgba(197, 168, 128, 0.15)', color: 'var(--accent-gold)' },
  pending_deposit: { label: 'Seña pendiente de aprobación', bg: 'rgba(197, 168, 128, 0.15)', color: 'var(--accent-gold)' },
  no_show: { label: 'No se presentó', bg: 'rgba(203, 120, 112, 0.15)', color: 'var(--error)' },
};

export default function AppointmentsTab({
  appointments = [],
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
  servicesList = [],
  clientsList = [],
  onCreateManualAppointment,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Modal para agendar turno manual
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    client_name: '',
    has_no_phone: false,
    client_phone: '',
    client_email: '',
    appointment_date: selectedDate || '',
    appointment_time: '10:00',
    service: '',
    price: '',
  });
  const [manualError, setManualError] = useState('');
  const [manualSuccess, setManualSuccess] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  // Lista de servicios disponibles combinando los configurados con el fallback
  const availableServices = useMemo(() => {
    if (servicesList && servicesList.length > 0) {
      return servicesList;
    }
    return Object.entries(SERVICES_MAP).map(([id, name]) => ({
      id,
      name,
      price: 0,
      duration: '1h 30m',
      category: id.includes('pedi') ? 'pedicura' : 'manicura',
    }));
  }, [servicesList]);

  // Turnos ocupados en la fecha seleccionada dentro del modal para evitar colisiones
  const occupiedSlotsOnSelectedDate = useMemo(() => {
    if (!manualForm.appointment_date || !appointments) return {};
    const map = {};
    for (const appt of appointments) {
      if (appt.appointment_date === manualForm.appointment_date && appt.status !== 'cancelled') {
        map[appt.appointment_time] = appt.client_name;
      }
    }
    return map;
  }, [manualForm.appointment_date, appointments]);

  const openManualModal = () => {
    const todayStr = selectedDate || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
    const firstService = availableServices[0] || null;

    setManualForm({
      client_name: '',
      has_no_phone: false,
      client_phone: '',
      client_email: '',
      appointment_date: todayStr,
      appointment_time: '10:00',
      service: firstService ? firstService.id : 'semi_mani',
      price: firstService ? firstService.price : '',
    });
    setManualError('');
    setManualSuccess('');
    setShowManualModal(true);
  };

  const closeManualModal = () => {
    if (submittingManual) return;
    setShowManualModal(false);
    setManualError('');
    setManualSuccess('');
  };

  // Manejar cambio de nombre de clienta con autocompletado si ya existe
  const handleClientNameChange = (val) => {
    const matchedClient = (clientsList || []).find(
      (c) => c.client_name?.trim().toLowerCase() === val.trim().toLowerCase()
    );

    if (matchedClient) {
      const clientHasNoPhone = isNoPhone(matchedClient.client_phone);
      setManualForm((prev) => ({
        ...prev,
        client_name: matchedClient.client_name,
        has_no_phone: clientHasNoPhone,
        client_phone: clientHasNoPhone ? matchedClient.client_phone : matchedClient.client_phone || '',
        client_email: matchedClient.client_email || '',
      }));
    } else {
      setManualForm((prev) => ({
        ...prev,
        client_name: val,
      }));
    }
  };

  const handleServiceChange = (serviceId) => {
    const found = availableServices.find((s) => s.id === serviceId);
    setManualForm((prev) => ({
      ...prev,
      service: serviceId,
      price: found ? found.price : prev.price,
    }));
  };

  const handleSubmitManual = async (e) => {
    e.preventDefault();
    setManualError('');
    setManualSuccess('');

    if (!manualForm.client_name.trim()) {
      setManualError('Por favor ingresá el nombre de la clienta.');
      return;
    }

    if (!manualForm.has_no_phone && (!manualForm.client_phone || manualForm.client_phone.trim().length < 6)) {
      setManualError('Ingresá el número de celular o marcá la opción "No tiene celular".');
      return;
    }

    // Safeguard en frontend: evitar poner el celular personal de Mili
    const cleanDigits = (manualForm.client_phone || '').replace(/\D/g, '');
    if (!manualForm.has_no_phone && cleanDigits.endsWith('3413022674')) {
      setManualError('No podés usar el teléfono personal de Mili. Si la clienta no tiene celular, tildá la opción "No tiene celular / WhatsApp".');
      return;
    }

    if (!manualForm.appointment_date || !manualForm.appointment_time) {
      setManualError('Por favor seleccioná fecha y horario.');
      return;
    }

    if (!manualForm.service) {
      setManualError('Por favor seleccioná un servicio.');
      return;
    }

    setSubmittingManual(true);
    try {
      const res = await onCreateManualAppointment({
        client_name: manualForm.client_name.trim(),
        has_no_phone: manualForm.has_no_phone,
        client_phone: manualForm.has_no_phone ? (manualForm.client_phone || '') : manualForm.client_phone.trim(),
        client_email: manualForm.client_email ? manualForm.client_email.trim() : null,
        appointment_date: manualForm.appointment_date,
        appointment_time: manualForm.appointment_time,
        service: manualForm.service,
        price: manualForm.price !== '' ? parseInt(manualForm.price, 10) : undefined,
      });

      if (res?.success) {
        setManualSuccess('¡Turno agendado exitosamente!');
        setTimeout(() => {
          setShowManualModal(false);
          setManualSuccess('');
        }, 1200);
      } else {
        setManualError(res?.error || 'No se pudo crear el turno manual.');
      }
    } catch (err) {
      console.error('Error submitting manual appointment:', err);
      setManualError('Error de conexión con el servidor al registrar el turno.');
    } finally {
      setSubmittingManual(false);
    }
  };

  const getWhatsAppLink = (phone, name, date, time) => {
    if (!phone || isNoPhone(phone)) return '#';
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
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Filtrar por estado (solo "Por Confirmar") y por búsqueda de nombre/teléfono
  const visibleAppointments = appointments
    .filter((appt) => viewMode !== 'pending' || PENDING_STATUSES.includes(appt.status))
    .filter((appt) => {
      if (viewMode === 'day' || !searchTerm.trim()) return true;
      const term = searchTerm.trim().toLowerCase();
      const termDigits = term.replace(/\D/g, '');
      const nameMatch = (appt.client_name || '').toLowerCase().includes(term);
      const isWithoutPhone = isNoPhone(appt.client_phone);
      const phoneMatch = !isWithoutPhone && termDigits.length > 0 && (appt.client_phone || '').includes(termDigits);
      const sintelMatch = isWithoutPhone && ('sin celular').includes(term);
      return nameMatch || phoneMatch || sintelMatch;
    });

  const titles = {
    day: 'Turnos del Día',
    pending: 'Turnos por Confirmar',
  };

  return (
    <>
      <div className={`${styles.bookingsCard} glass-card-gold`}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px',
            marginBottom: '25px',
          }}
        >
          <h2 className={styles.sectionTitle} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
            {titles[viewMode] || 'Todos los Próximos Turnos'}
          </h2>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Botón destacado: Agendar Turno Manual */}
            <button
              type="button"
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '20px',
              }}
              onClick={openManualModal}
              title="Agendar turno manualmente para personas mayores o clientas sin celular"
            >
              <CalendarPlus size={16} /> Agendar Turno
            </button>

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
                  transition: 'all 0.2s',
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
                  transition: 'all 0.2s',
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
                  transition: 'all 0.2s',
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
              style={{
                padding: '8px 12px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
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
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
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
            {visibleAppointments.map((appt) => {
              const withoutPhone = isNoPhone(appt.client_phone);

              return (
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
                            year: 'numeric',
                          })}
                        </span>
                      )}

                      <span className={styles.clientName}>{appt.client_name}</span>

                      {withoutPhone && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontWeight: 600,
                            backgroundColor: 'rgba(212, 165, 116, 0.15)',
                            color: 'var(--accent-gold)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Clienta agendada manualmente sin celular"
                        >
                          <PhoneOff size={11} /> Sin celular
                        </span>
                      )}

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
                      <span>
                        Tel:{' '}
                        {withoutPhone ? (
                          <em style={{ color: 'var(--text-muted)' }}>Sin celular (agendada manual)</em>
                        ) : (
                          appt.client_phone
                        )}
                      </span>
                      {appt.client_email && <span>Email: {appt.client_email}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {/* Botón WhatsApp */}
                    {withoutPhone ? (
                      <span
                        className={styles.contactLink}
                        style={{
                          opacity: 0.55,
                          cursor: 'not-allowed',
                          color: 'var(--text-muted)',
                          border: '1px dashed var(--border-color)',
                          background: 'none',
                        }}
                        title="Esta clienta no tiene celular / WhatsApp registrado"
                      >
                        <PhoneOff size={15} /> Sin WhatsApp
                      </span>
                    ) : (
                      <a
                        href={getWhatsAppLink(appt.client_phone, appt.client_name, appt.appointment_date, appt.appointment_time)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.contactLink}
                        title="Enviar recordatorio de WhatsApp"
                      >
                        <Phone size={16} /> Remind
                      </a>
                    )}

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
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Agendar Turno Manual para Personas Mayores / Sin Celular */}
      {showManualModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(44, 34, 32, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={closeManualModal}
        >
          <div
            className="glass-card-gold animate-fade-in"
            style={{
              padding: '28px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
              borderRadius: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeManualModal}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
              title="Cerrar"
              disabled={submittingManual}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <CalendarPlus size={20} style={{ color: 'var(--accent-rose)' }} />
                <h3 className={styles.sectionTitle} style={{ borderBottom: 'none', paddingBottom: 0, margin: 0, fontSize: '1.35rem' }}>
                  Agendar Turno Manual
                </h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                Pensado para agendar turnos de clientas mayores o personas que no usan WhatsApp ni la web.
              </p>
            </div>

            <form onSubmit={handleSubmitManual} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Nombre de la Clienta con Autocompletado */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                  Nombre de la Clienta *
                </label>
                <input
                  list="admin-clients-datalist"
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="Ej: Marta Gómez (escribí o elegí de la lista)"
                  value={manualForm.client_name}
                  onChange={(e) => handleClientNameChange(e.target.value)}
                  disabled={submittingManual}
                  required
                />
                <datalist id="admin-clients-datalist">
                  {(clientsList || []).map((c) => (
                    <option key={c.client_phone} value={c.client_name}>
                      {isNoPhone(c.client_phone) ? '(Sin celular)' : c.client_phone}
                    </option>
                  ))}
                </datalist>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Si la clienta ya vino antes, podés seleccionarla para autocompletar sus datos.
                </span>
              </div>

              {/* Casilla especial: Sin celular / Persona mayor */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: manualForm.has_no_phone ? 'rgba(136, 167, 131, 0.12)' : 'rgba(212, 165, 116, 0.08)',
                  border: `1px solid ${manualForm.has_no_phone ? 'var(--success)' : 'rgba(212, 165, 116, 0.3)'}`,
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--text-dark)',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={manualForm.has_no_phone}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setManualForm((prev) => ({
                        ...prev,
                        has_no_phone: checked,
                        client_phone: checked ? '' : prev.client_phone,
                      }));
                    }}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: 'var(--accent-rose)',
                    }}
                    disabled={submittingManual}
                  />
                  <span>La clienta es mayor o no tiene celular / WhatsApp</span>
                </label>

                {manualForm.has_no_phone ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '28px', color: 'var(--success)', fontSize: '0.8rem' }}>
                    <UserCheck size={14} />
                    <span>Se registrará con un identificador seguro para que no se mezcle con Mili ni con otras clientas.</span>
                  </div>
                ) : (
                  <div style={{ marginTop: '4px', paddingLeft: '28px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '4px' }}>
                      Número de celular / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      className="input"
                      placeholder="Ej: 3413022674 (código de área + número)"
                      value={manualForm.client_phone}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, client_phone: e.target.value }))}
                      style={{ width: '100%', fontSize: '0.9rem' }}
                      disabled={submittingManual}
                      required={!manualForm.has_no_phone}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                      Nunca uses el celular de Mili para una clienta; tildá la opción arriba si no tiene teléfono.
                    </span>
                  </div>
                )}
              </div>

              {/* Email (opcional) */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                  Email (opcional)
                </label>
                <input
                  type="email"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="Ej: clienta@gmail.com"
                  value={manualForm.client_email}
                  onChange={(e) => setManualForm((prev) => ({ ...prev, client_email: e.target.value }))}
                  disabled={submittingManual}
                />
              </div>

              {/* Fecha y Horario */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                    Fecha *
                  </label>
                  <input
                    type="date"
                    className="input"
                    style={{ width: '100%' }}
                    value={manualForm.appointment_date}
                    onChange={(e) => setManualForm((prev) => ({ ...prev, appointment_date: e.target.value }))}
                    disabled={submittingManual}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                    Horario *
                  </label>
                  <input
                    type="time"
                    className="input"
                    style={{ width: '100%' }}
                    value={manualForm.appointment_time}
                    onChange={(e) => setManualForm((prev) => ({ ...prev, appointment_time: e.target.value }))}
                    disabled={submittingManual}
                    required
                  />
                </div>
              </div>

              {/* Accesos rápidos a los horarios estándar */}
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Horarios habituales del estudio:
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {STANDARD_SLOTS.map((slot) => {
                    const isOccupied = occupiedSlotsOnSelectedDate[slot];
                    const isSelected = manualForm.appointment_time === slot;

                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setManualForm((prev) => ({ ...prev, appointment_time: slot }))}
                        disabled={submittingManual}
                        title={isOccupied ? `Ocupado por ${isOccupied}` : 'Horario disponible'}
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.78rem',
                          borderRadius: '14px',
                          border: isSelected
                            ? '1px solid var(--accent-rose)'
                            : isOccupied
                            ? '1px dashed rgba(203, 120, 112, 0.4)'
                            : '1px solid var(--border-color)',
                          backgroundColor: isSelected
                            ? 'var(--accent-rose)'
                            : isOccupied
                            ? 'rgba(203, 120, 112, 0.08)'
                            : 'var(--white)',
                          color: isSelected
                            ? 'var(--white)'
                            : isOccupied
                            ? 'var(--error)'
                            : 'var(--text-dark)',
                          fontWeight: isSelected || isOccupied ? 600 : 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {slot} hs
                        {isOccupied && !isSelected && (
                          <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>(ocupado)</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {occupiedSlotsOnSelectedDate[manualForm.appointment_time] && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px', color: 'var(--error)', fontSize: '0.76rem' }}>
                    <AlertCircle size={13} />
                    <span>
                      Atención: las {manualForm.appointment_time} hs ya figura ocupado por{' '}
                      <strong>{occupiedSlotsOnSelectedDate[manualForm.appointment_time]}</strong>.
                    </span>
                  </div>
                )}
              </div>

              {/* Servicio y Precio */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                    Servicio *
                  </label>
                  <select
                    className="input"
                    style={{ width: '100%', height: '42px' }}
                    value={manualForm.service}
                    onChange={(e) => handleServiceChange(e.target.value)}
                    disabled={submittingManual}
                    required
                  >
                    {availableServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.price > 0 ? `(${formatMoney(s.price)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                    Precio ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    style={{ width: '100%', fontWeight: 700, color: 'var(--accent-gold)' }}
                    placeholder="0"
                    value={manualForm.price}
                    onChange={(e) => setManualForm((prev) => ({ ...prev, price: e.target.value }))}
                    disabled={submittingManual}
                  />
                </div>
              </div>

              {/* Mensajes de error y éxito */}
              {manualError && (
                <div
                  style={{
                    backgroundColor: 'rgba(203, 120, 112, 0.1)',
                    border: '1px solid var(--error)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    color: 'var(--error)',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{manualError}</span>
                </div>
              )}

              {manualSuccess && (
                <div
                  style={{
                    backgroundColor: 'rgba(136, 167, 131, 0.15)',
                    border: '1px solid var(--success)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    color: 'var(--success)',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Sparkles size={16} />
                  <span>{manualSuccess}</span>
                </div>
              )}

              {/* Botones de acción */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, padding: '10px' }}
                  onClick={closeManualModal}
                  disabled={submittingManual}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  disabled={submittingManual}
                >
                  {submittingManual ? (
                    <>
                      <div className="loader" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                      <span>Agendando...</span>
                    </>
                  ) : (
                    <>
                      <CalendarPlus size={16} />
                      <span>Confirmar Turno</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
