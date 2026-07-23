'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Sparkles } from 'lucide-react';
import styles from '@/styles/booking.module.css';

// Los servicios se cargan dinámicamente desde la base de datos.
const FALLBACK_SERVICES = [
  { id: 'semi_mani', category: 'manicura', name: 'Semipermanente', price: 14000, duration: '60 min' },
  { id: 'kapping', category: 'manicura', name: 'Kapping Poligel', price: 18000, duration: '90 min' },
  { id: 'soft_gel', category: 'manicura', name: 'Soft Gel', price: 19000, duration: '90 min' },
  { id: 'esculpidas', category: 'manicura', name: 'Esculpidas', price: 20000, duration: '120 min' },
  { id: 'retirado_mani', category: 'manicura', name: 'Retirado final', price: 5000, duration: '30 min' },
  { id: 'semi_pedi', category: 'pedicura', name: 'Semipermanente', price: 12000, duration: '60 min' },
  { id: 'pedi_completa', category: 'pedicura', name: 'Retirado de callos, grietas y piel muerta + hidratación', price: 15000, duration: '75 min' },
  { id: 'pedi_completa_semi', category: 'pedicura', name: 'Retirado de callos, grietas y piel muerta + hidratación + semi', price: 20000, duration: '100 min' }
];

export default function BookingCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedService, setSelectedService] = useState('');
  const [servicesList, setServicesList] = useState(FALLBACK_SERVICES);
  
  const [bookedTimes, setBookedTimes] = useState([]);
  const [enable18Weekday, setEnable18Weekday] = useState(true);
  const [blockedWeekdays, setBlockedWeekdays] = useState([0]); // 0 = Domingo cerrado por defecto
  const [blockedDates, setBlockedDates] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [error, setError] = useState('');

  // Form states
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Obtener la configuración del turno de las 18:00hs, bloqueos y los servicios desde la DB
  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data.enable_18_weekday !== undefined) {
          setEnable18Weekday(data.enable_18_weekday);
        }
        if (data.blocked_weekdays !== undefined) {
          const list = data.blocked_weekdays.split(',').map(d => parseInt(d.trim(), 10)).filter(n => !isNaN(n));
          setBlockedWeekdays(list);
        }
        if (data.blocked_dates !== undefined) {
          const list = data.blocked_dates.split(',').map(d => d.trim()).filter(Boolean);
          setBlockedDates(list);
        }
      })
      .catch(err => console.error('Error fetching settings:', err));

    fetch('/api/admin/services')
      .then(res => res.json())
      .then(data => {
        if (data.services && data.services.length > 0) {
          setServicesList(data.services);
        }
      })
      .catch(err => console.error('Error fetching services:', err));
  }, []);

  // Cargar datos guardados del cliente desde localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('mili_client_name');
      const savedPhone = localStorage.getItem('mili_client_phone');
      const savedEmail = localStorage.getItem('mili_client_email');
      if (savedName) setClientName(savedName);
      if (savedPhone) setClientPhone(savedPhone);
      if (savedEmail) setClientEmail(savedEmail);
      if (savedName && savedPhone) {
        setIsRegistered(true);
      }
    }
  }, []);

  // Eliminar datos guardados (Cerrar sesión de clienta)
  const handleUnregister = () => {
    localStorage.removeItem('mili_client_name');
    localStorage.removeItem('mili_client_phone');
    localStorage.removeItem('mili_client_email');
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setIsRegistered(false);
  };

  // Obtener turnos reservados cada vez que se selecciona una fecha
  useEffect(() => {
    if (!selectedDate) return;
    
    setLoadingSlots(true);
    setError('');
    setSelectedTime(null); // Resetear hora al cambiar fecha
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    fetch(`/api/appointments?date=${dateStr}`)
      .then(res => res.json())
      .then(data => {
        if (data.bookedTimes) {
          setBookedTimes(data.bookedTimes);
        } else {
          setBookedTimes([]);
        }
      })
      .catch(err => {
        console.error('Error fetching appointments:', err);
        setError('Error al cargar horarios disponibles.');
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [selectedDate]);

  // Navegación del calendario
  const prevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    // No permitir ir a meses anteriores al actual
    const now = new Date();
    if (prev.getFullYear() < now.getFullYear() || (prev.getFullYear() === now.getFullYear() && prev.getMonth() < now.getMonth())) {
      return;
    }
    setCurrentDate(prev);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Generar días del mes
  const generateDays = () => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Dom, 1 = Lun...
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Días de relleno del mes anterior
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        dayNum: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i),
      });
    }

    // Días del mes actual
    for (let i = 1; i <= lastDay; i++) {
      const dateObj = new Date(year, month, i);
      const dateCopy = new Date(dateObj);
      dateCopy.setHours(0, 0, 0, 0);
      
      const yearNum = dateObj.getFullYear();
      const monthNum = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dayNumStr = String(dateObj.getDate()).padStart(2, '0');
      const dateStr = `${yearNum}-${monthNum}-${dayNumStr}`;
      
      const isBlockedDate = blockedDates.includes(dateStr);
      const isBlockedWeekday = blockedWeekdays.includes(dateObj.getDay());
      
      days.push({
        dayNum: i,
        isCurrentMonth: true,
        date: dateObj,
        isToday: dateCopy.getTime() === today.getTime(),
        isDisabled: dateCopy.getTime() < today.getTime() || isBlockedWeekday || isBlockedDate,
        isSunday: dateObj.getDay() === 0,
      });
    }

    // Relleno del mes siguiente para completar la cuadrícula de 42 celdas
    const totalCells = 42;
    const nextMonthFiller = totalCells - days.length;
    for (let i = 1; i <= nextMonthFiller; i++) {
      days.push({
        dayNum: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }

    return days;
  };

  const days = generateDays();

  // Calcular horas disponibles para la fecha seleccionada
  const getAvailableSlots = () => {
    if (!selectedDate) return [];
    
    const dayOfWeek = selectedDate.getDay(); // 0 = Dom, 6 = Sáb, 1-5 = Lun-Vie
    
    if (dayOfWeek === 0) return []; // Domingos cerrado

    if (dayOfWeek === 6) {
      // Sábados: 8, 10, 12, 14, 16, 18
      return ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
    } else {
      // Lunes a Viernes: 8, 10, 14, 16, 18 (18 toggleable)
      const times = ['08:00', '10:00', '14:00', '16:00'];
      if (enable18Weekday) {
        times.push('18:00');
      }
      return times;
    }
  };

  const slots = getAvailableSlots();

  // Buscar datos del cliente por celular (autocompletado)
  const triggerAutocomplete = async (phoneValue, currentName, currentEmail) => {
    const cleanPhone = phoneValue.replace(/\D/g, '');
    if (cleanPhone.length < 8) return;

    try {
      const res = await fetch(`/api/appointments/autocomplete?phone=${encodeURIComponent(phoneValue)}`);
      const data = await res.json();
      if (data.found) {
        // Autocompleta si está vacío o si el nombre actual es muy corto (menos de 3 caracteres)
        if (currentName.trim() === '' || currentName.trim().length < 3) {
          setClientName(data.client_name);
        }
        if (!currentEmail || currentEmail.trim() === '') {
          setClientEmail(data.client_email || '');
        }
      }
    } catch (err) {
      console.error('Error fetching autocomplete:', err);
    }
  };

  const handlePhoneBlur = () => {
    triggerAutocomplete(clientPhone, clientName, clientEmail);
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    setClientPhone(value);
    
    // Si llega a 10 dígitos o más (celular argentino estándar), autocompletar automáticamente al escribir
    const clean = value.replace(/\D/g, '');
    if (clean.length === 10) {
      triggerAutocomplete(value, clientName, clientEmail);
    }
  };

  // Enviar el formulario de reserva
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !selectedService || !clientName || !clientPhone) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }

    setSubmitting(true);
    setError('');

    const dateStr = selectedDate.toISOString().split('T')[0];

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: clientName,
          client_phone: clientPhone,
          client_email: clientEmail,
          appointment_date: dateStr,
          appointment_time: selectedTime,
          service: selectedService,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al agendar el turno');
      }

      // Guardar en localStorage para recordar en la próxima visita
      if (typeof window !== 'undefined') {
        localStorage.setItem('mili_client_name', clientName);
        localStorage.setItem('mili_client_phone', clientPhone);
        localStorage.setItem('mili_client_email', clientEmail || '');
        setIsRegistered(true);
      }

      setBookingSuccess(data.appointment);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Formatear fecha para mostrar
  const formatDateText = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Volver a reservar otro turno
  const handleReset = () => {
    setBookingSuccess(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedService('');
    setError('');
    // Mantenemos los datos de la clienta prellenados
    if (typeof window !== 'undefined') {
      const n = localStorage.getItem('mili_client_name') || '';
      const p = localStorage.getItem('mili_client_phone') || '';
      const e = localStorage.getItem('mili_client_email') || '';
      setClientName(n);
      setClientPhone(p);
      setClientEmail(e);
      if (n && p) {
        setIsRegistered(true);
      }
    }
  };

  // Si se reservó exitosamente, mostrar el comprobante
  if (bookingSuccess) {
    const selectedServiceDetails = servicesList.find(s => s.id === bookingSuccess.service);
    return (
      <div className={`${styles.successCard} glass-card-gold animate-scale-in`}>
        <div className={styles.successIcon}>
          <Sparkles size={48} />
        </div>
        <h2 className={styles.successTitle}>¡Turno Confirmado!</h2>
        <p>Tu reserva ha sido registrada con éxito para Mili Nails.</p>

        <div className={styles.ticketDetails}>
          <div className={styles.ticketRow}>
            <span className={styles.ticketLabel}>Clienta:</span>
            <span className={styles.ticketValue}>{bookingSuccess.client_name}</span>
          </div>
          <div className={styles.ticketRow}>
            <span className={styles.ticketLabel}>Celular:</span>
            <span className={styles.ticketValue}>{bookingSuccess.client_phone}</span>
          </div>
          <div className={styles.ticketRow}>
            <span className={styles.ticketLabel}>Servicio:</span>
            <span className={styles.ticketValue}>{selectedServiceDetails?.name || bookingSuccess.service}</span>
          </div>
          <div className={styles.ticketRow}>
            <span className={styles.ticketLabel}>Fecha:</span>
            <span className={styles.ticketValue}>
              {new Date(`${bookingSuccess.appointment_date}T00:00:00`).toLocaleDateString('es-AR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
          </div>
          <div className={styles.ticketRow}>
            <span className={styles.ticketLabel}>Horario:</span>
            <span className={styles.ticketValue}>{bookingSuccess.appointment_time} hs</span>
          </div>
        </div>

        <p className={styles.selectedDateText}>
          Te esperamos en el local. Si necesitas cancelar o modificar el turno, por favor contáctanos directamente.
        </p>

        <button className="btn-primary" onClick={handleReset} style={{ marginTop: '10px' }}>
          Reservar otro turno
        </button>
      </div>
    );
  }

  const isPrevDisabled = () => {
    const now = new Date();
    return year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth());
  };

  return (
    <div className={styles.bookingContainer}>
      {/* Columna Izquierda: Calendario */}
      <div className={`${styles.calendarCard} glass-card`}>
        <div className={styles.calendarHeader}>
          <button 
            type="button" 
            className={styles.navButton} 
            onClick={prevMonth} 
            disabled={isPrevDisabled()}
            aria-label="Mes anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <h3 className={styles.monthTitle}>
            {currentDate.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}
          </h3>
          <button 
            type="button" 
            className={styles.navButton} 
            onClick={nextMonth}
            aria-label="Siguiente mes"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className={styles.weekDaysRow}>
          <span>Dom</span>
          <span>Lun</span>
          <span>Mar</span>
          <span>Mié</span>
          <span>Jue</span>
          <span>Vie</span>
          <span>Sáb</span>
        </div>

        <div className={styles.daysGrid}>
          {days.map((day, idx) => {
            const isSelected = selectedDate && 
              day.date.getDate() === selectedDate.getDate() && 
              day.date.getMonth() === selectedDate.getMonth() && 
              day.date.getFullYear() === selectedDate.getFullYear();
              
            const isClickable = day.isCurrentMonth && !day.isDisabled;

            let dayClasses = styles.dayCell;
            if (!day.isCurrentMonth) dayClasses += ` ${styles.disabled}`;
            else if (day.isDisabled) {
              dayClasses += ` ${day.isSunday ? styles.sunday : styles.disabled}`;
            }
            if (day.isToday) dayClasses += ` ${styles.today}`;
            if (isSelected) dayClasses += ` ${styles.selected}`;

            return (
              <button
                key={idx}
                type="button"
                className={dayClasses}
                onClick={() => isClickable && setSelectedDate(day.date)}
                disabled={!isClickable}
              >
                {day.dayNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Columna Derecha: Horarios y Formulario */}
      <div className={`${styles.detailsCard} glass-card-gold`}>
        {/* Banner de sesión activa */}
        {isRegistered && (
          <div style={{ padding: '10px 15px', backgroundColor: 'rgba(136, 167, 131, 0.15)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--success)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '8px' }} className="animate-fade-in">
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Sesión: {clientName} ({clientPhone})
            </span>
            <button 
              type="button" 
              onClick={handleUnregister}
              style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
            >
              Cerrar sesión
            </button>
          </div>
        )}

        <div>
          <h3 className={styles.cardTitle}>Detalles del Turno</h3>
          <p className={styles.selectedDateText}>
            {selectedDate 
              ? formatDateText(selectedDate)
              : 'Selecciona una fecha en el calendario para ver horarios.'}
          </p>
        </div>



        {selectedDate && (
          <div className={styles.slotsSection}>
            <h4 className={styles.slotsTitle}>Horarios Disponibles</h4>
            
            {loadingSlots ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                <div className={styles.loader}></div>
              </div>
            ) : slots.length === 0 ? (
              <p className={styles.selectedDateText}>No hay horarios disponibles.</p>
            ) : (
              <div className={styles.slotsGrid}>
                {slots.map((time) => {
                  const isBooked = bookedTimes.includes(time);
                  const isSelected = selectedTime === time;
                  
                  let slotClass = styles.timeSlot;
                  if (isBooked) slotClass += ` ${styles.slotBooked}`;
                  if (isSelected) slotClass += ` ${styles.slotSelected}`;

                  return (
                    <button
                      key={time}
                      type="button"
                      className={slotClass}
                      onClick={() => !isBooked && setSelectedTime(time)}
                      disabled={isBooked}
                    >
                      {time} hs
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedDate && selectedTime && (
          <form className={`${styles.form} animate-fade-in`} onSubmit={handleBookingSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Servicio *</label>
              <select
                className={styles.select}
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                required
              >
                <option value="">Selecciona un servicio...</option>
                
                <optgroup label="Manicuría">
                  {servicesList.filter(s => s.category === 'manicura').map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (${new Intl.NumberFormat('es-AR').format(s.price)} - {s.duration})
                    </option>
                  ))}
                </optgroup>

                <optgroup label="Pedicuría">
                  {servicesList.filter(s => s.category === 'pedicura').map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (${new Intl.NumberFormat('es-AR').format(s.price)} - {s.duration})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {!isRegistered && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nombre Completo *</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Ej. María Pérez"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Teléfono Celular *</label>
                  <input
                    type="tel"
                    className={styles.input}
                    placeholder="Ej. 11 2345 6789"
                    value={clientPhone}
                    onChange={handlePhoneChange}
                    onBlur={handlePhoneBlur}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Email (Opcional)</label>
                  <input
                    type="email"
                    className={styles.input}
                    placeholder="ejemplo@correo.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>
              </>
            )}

            {error && <p style={{ color: 'var(--error)', fontSize: '0.85rem', fontWeight: 600 }}>{error}</p>}

            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{ marginTop: '10px' }}
            >
              {submitting ? 'Agendando...' : 'Confirmar Turno'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
