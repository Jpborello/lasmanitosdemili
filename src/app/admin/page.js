'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Phone, Trash2, LogOut, RefreshCw, Star, MessageSquare, Award, DollarSign, Users, TrendingUp, Settings, ExternalLink } from 'lucide-react';
import styles from '@/styles/admin.module.css';

// Lista de servicios de manicuría para traducir IDs a nombres amigables
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

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  // Tab System: 'appointments', 'reviews', 'metrics', 'services'
  const [activeTab, setActiveTab] = useState('appointments'); 

  // Appointments State
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [viewMode, setViewMode] = useState('day'); // 'day' o 'all'
  const [loadingData, setLoadingData] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Metrics & Ranking State
  const [metrics, setMetrics] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Dynamic Services State
  const [servicesList, setServicesList] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [savingServices, setSavingServices] = useState(false);

  // Global Config / Settings
  const [enable18Weekday, setEnable18Weekday] = useState(true);
  const [blockedWeekdays, setBlockedWeekdays] = useState([0]); // 0 = Domingo cerrado por defecto
  const [blockedDates, setBlockedDates] = useState([]);
  const [dateToBlock, setDateToBlock] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();

  // 1. Verificar autenticación al montar
  useEffect(() => {
    fetch('/api/admin/login')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setAuthenticated(true);
          setLoadingAuth(false);
          // Establecer fecha por defecto como hoy en formato local YYYY-MM-DD
          const today = new Date();
          const offset = today.getTimezoneOffset();
          const localToday = new Date(today.getTime() - (offset*60*1000));
          setSelectedDate(localToday.toISOString().split('T')[0]);
        } else {
          router.push('/admin/login');
        }
      })
      .catch(() => {
        router.push('/admin/login');
      });
  }, [router]);

  // 2. Obtener configuraciones del sistema
  useEffect(() => {
    if (!authenticated) return;

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
  }, [authenticated]);

  // 3. Obtener turnos según la fecha o el modo seleccionado
  const fetchAppointments = async () => {
    if (!authenticated) return;
    setLoadingData(true);
    try {
      let url = '/api/appointments';
      if (viewMode === 'day') {
        url += `?date=${selectedDate}`;
      } else {
        url += '?all=true';
      }

      const res = await fetch(url);
      const data = await res.json();
      
      if (data.appointments) {
        setAppointments(data.appointments);
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (selectedDate || viewMode === 'all') {
      fetchAppointments();
    }
  }, [selectedDate, viewMode, authenticated]);

  // 4. Obtener opiniones
  const fetchReviews = async () => {
    if (!authenticated) return;
    setLoadingReviews(true);
    try {
      const res = await fetch('/api/admin/reviews');
      const data = await res.json();
      if (data.reviews) {
        setReviews(data.reviews);
      }
    } catch (error) {
      console.error('Error fetching admin reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reviews' && authenticated) {
      fetchReviews();
    }
  }, [activeTab, authenticated]);

  // 5. Obtener métricas y ranking financiero
  const fetchMetrics = async () => {
    if (!authenticated) return;
    setLoadingMetrics(true);
    try {
      const res = await fetch('/api/admin/metrics');
      const data = await res.json();
      if (data.metrics && data.ranking) {
        setMetrics(data.metrics);
        setRanking(data.ranking);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'metrics' && authenticated) {
      fetchMetrics();
    }
  }, [activeTab, authenticated]);

  // 6. Obtener servicios para edición de precios
  const fetchServices = async () => {
    if (!authenticated) return;
    setLoadingServices(true);
    try {
      const res = await fetch('/api/admin/services');
      const data = await res.json();
      if (data.services) {
        setServicesList(data.services);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'services' && authenticated) {
      fetchServices();
    }
  }, [activeTab, authenticated]);

  // Cambiar el precio localmente en el input
  const handlePriceChange = (id, newPrice) => {
    setServicesList(prev => prev.map(s => s.id === id ? { ...s, price: newPrice } : s));
  };

  // Guardar los precios en la base de datos
  const handleSavePrices = async (e) => {
    e.preventDefault();
    setSavingServices(true);
    try {
      const pricesPayload = servicesList.map(s => ({ id: s.id, price: s.price }));
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices: pricesPayload }),
      });

      if (res.ok) {
        alert('Precios guardados exitosamente. Ya están actualizados en la web.');
      } else {
        alert('Error al guardar los precios.');
      }
    } catch (err) {
      console.error('Error saving prices:', err);
      alert('Error de conexión.');
    } finally {
      setSavingServices(false);
    }
  };

  // 7. Cambiar el toggle del turno de las 18:00hs
  const handleToggle18 = async () => {
    setActionLoading(true);
    try {
      const nextVal = !enable18Weekday;
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable_18_weekday: nextVal }),
      });

      if (res.ok) {
        setEnable18Weekday(nextVal);
      } else {
        alert('No se pudo guardar la configuración.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al actualizar.');
    } finally {
      setActionLoading(false);
    }
  };

  // Cambiar bloqueo de día de la semana
  const handleToggleWeekday = async (dayNum) => {
    setActionLoading(true);
    try {
      let nextBlocked;
      if (blockedWeekdays.includes(dayNum)) {
        nextBlocked = blockedWeekdays.filter(d => d !== dayNum);
      } else {
        nextBlocked = [...blockedWeekdays, dayNum];
      }

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_weekdays: nextBlocked.join(',') }),
      });

      if (res.ok) {
        setBlockedWeekdays(nextBlocked);
      } else {
        alert('No se pudo guardar la configuración.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al actualizar.');
    } finally {
      setActionLoading(false);
    }
  };

  // Bloquear una fecha específica
  const handleAddBlockedDate = async (e) => {
    e.preventDefault();
    if (!dateToBlock) return;

    if (blockedDates.includes(dateToBlock)) {
      alert('Esta fecha ya está bloqueada.');
      return;
    }

    setActionLoading(true);
    try {
      const nextBlocked = [...blockedDates, dateToBlock];
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_dates: nextBlocked.join(',') }),
      });

      if (res.ok) {
        setBlockedDates(nextBlocked);
        setDateToBlock('');
      } else {
        alert('No se pudo bloquear la fecha.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al bloquear.');
    } finally {
      setActionLoading(false);
    }
  };

  // Desbloquear una fecha específica
  const handleRemoveBlockedDate = async (dateStr) => {
    const confirmUnlock = window.confirm(`¿Estás segura de que deseas desbloquear la fecha ${dateStr}?`);
    if (!confirmUnlock) return;

    setActionLoading(true);
    try {
      const nextBlocked = blockedDates.filter(d => d !== dateStr);
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_dates: nextBlocked.join(',') }),
      });

      if (res.ok) {
        setBlockedDates(nextBlocked);
      } else {
        alert('No se pudo desbloquear la fecha.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al desbloquear.');
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Cancelar un turno
  const handleCancelAppointment = async (id, clientName, date, time) => {
    const confirmCancel = window.confirm(
      `¿Estás segura de que deseas cancelar el turno de ${clientName} el día ${date} a las ${time}hs?`
    );

    if (!confirmCancel) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/appointments?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchAppointments();
      } else {
        alert('Error al cancelar el turno.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    } finally {
      setActionLoading(false);
    }
  };

  // 9. Aprobar una opinión
  const handleApproveReview = async (id) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        fetchReviews();
      } else {
        alert('Error al aprobar la opinión.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    } finally {
      setActionLoading(false);
    }
  };

  // 10. Eliminar una opinión
  const handleDeleteReview = async (id) => {
    const confirmDelete = window.confirm('¿Estás segura de que deseas eliminar esta opinión?');
    if (!confirmDelete) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchReviews();
      } else {
        alert('Error al eliminar la opinión.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    } finally {
      setActionLoading(false);
    }
  };

  // 11. Cerrar sesión
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/login', { method: 'DELETE' });
      router.push('/admin/login');
    } catch (err) {
      console.error(err);
    }
  };

  if (loadingAuth) {
    return (
      <div className={styles.loginContainer}>
        <div className="loader"></div>
      </div>
    );
  }

  // Generar link de WhatsApp
  const getWhatsAppLink = (phone, name, date, time) => {
    const cleanedPhone = phone.replace(/\D/g, ''); // Limpiar caracteres no numéricos
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

  // Generar link simple de WhatsApp para saludar a mejores clientas
  const getSimpleWhatsAppLink = (phone, name) => {
    const cleanedPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`¡Hola ${name}! Te escribo desde Mili Nails para saludarte y agradecerte por ser una de nuestras clientas más fieles. ♥`);
    return `https://wa.me/${cleanedPhone}?text=${message}`;
  };

  // Formatear pesos
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="container" style={{ padding: '40px 24px', minHeight: '100vh' }}>
      {/* Header */}
      <header className={styles.dashboardHeader}>
        <div className={styles.adminTitle}>
          Las Manitos de Mili <span>Panel de Control</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="/" className={styles.webBtn}>
            <ExternalLink size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Volver a la Web
          </a>
          <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Salir
          </button>
        </div>
      </header>

      {/* Tabs Selector */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            fontFamily: 'var(--font-serif)',
            fontSize: '1.2rem',
            fontWeight: 600,
            cursor: 'pointer',
            paddingBottom: '8px',
            color: activeTab === 'appointments' ? 'var(--text-dark)' : 'var(--text-muted)',
            borderBottom: activeTab === 'appointments' ? '2px solid var(--accent-rose)' : 'none',
            transition: 'var(--transition-smooth)'
          }}
          onClick={() => setActiveTab('appointments')}
        >
          Gestionar Turnos
        </button>
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            fontFamily: 'var(--font-serif)',
            fontSize: '1.2rem',
            fontWeight: 600,
            cursor: 'pointer',
            paddingBottom: '8px',
            color: activeTab === 'reviews' ? 'var(--text-dark)' : 'var(--text-muted)',
            borderBottom: activeTab === 'reviews' ? '2px solid var(--accent-rose)' : 'none',
            transition: 'var(--transition-smooth)'
          }}
          onClick={() => setActiveTab('reviews')}
        >
          Gestionar Opiniones
        </button>
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            fontFamily: 'var(--font-serif)',
            fontSize: '1.2rem',
            fontWeight: 600,
            cursor: 'pointer',
            paddingBottom: '8px',
            color: activeTab === 'metrics' ? 'var(--text-dark)' : 'var(--text-muted)',
            borderBottom: activeTab === 'metrics' ? '2px solid var(--accent-rose)' : 'none',
            transition: 'var(--transition-smooth)'
          }}
          onClick={() => setActiveTab('metrics')}
        >
          Métricas y Sorteos
        </button>
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            fontFamily: 'var(--font-serif)',
            fontSize: '1.2rem',
            fontWeight: 600,
            cursor: 'pointer',
            paddingBottom: '8px',
            color: activeTab === 'services' ? 'var(--text-dark)' : 'var(--text-muted)',
            borderBottom: activeTab === 'services' ? '2px solid var(--accent-rose)' : 'none',
            transition: 'var(--transition-smooth)'
          }}
          onClick={() => setActiveTab('services')}
        >
          Precios y Servicios
        </button>
      </div>

      {/* Tab 1: Appointments Panel */}
      {activeTab === 'appointments' && (
        <div className={`${styles.dashboardGrid} animate-fade-in`}>
          
          {/* Columna Izquierda: Configuración */}
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
                  onChange={handleToggle18}
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
                        onChange={() => handleToggleWeekday(day.val)}
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

            {/* Bloquear Fechas Específicas */}
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Bloquear Fechas
              </h3>
              
              <form onSubmit={handleAddBlockedDate} style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
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
                  style={{ padding: '6px 12px', fontSize: '0.8rem', border: '1px solid var(--accent-rose)', color: 'var(--accent-rose)' }}
                  disabled={actionLoading}
                >
                  Bloquear
                </button>
              </form>

              {blockedDates.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto', paddingRight: '5px' }}>
                  {blockedDates.map(dateStr => (
                    <div key={dateStr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'rgba(203, 120, 112, 0.05)', border: '1px solid rgba(203, 120, 112, 0.15)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        {new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBlockedDate(dateStr)}
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
          </div>

          {/* Columna Derecha: Turnos Agendados */}
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
                      border: 'none',
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      backgroundColor: viewMode === 'day' ? 'var(--text-dark)' : 'transparent',
                      color: viewMode === 'day' ? 'var(--white)' : 'var(--text-dark)',
                      transition: 'var(--transition-smooth)',
                    }}
                    onClick={() => setViewMode('day')}
                  >
                    Día
                  </button>
                  <button
                    type="button"
                    style={{
                      border: 'none',
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      backgroundColor: viewMode === 'all' ? 'var(--text-dark)' : 'transparent',
                      color: viewMode === 'all' ? 'var(--white)' : 'var(--text-dark)',
                      transition: 'var(--transition-smooth)',
                    }}
                    onClick={() => setViewMode('all')}
                  >
                    Todos
                  </button>
                </div>

                {/* Selector de fecha (solo visible en modo día) */}
                {viewMode === 'day' && (
                  <input
                    type="date"
                    className={styles.dateInput}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                )}
              </div>
            </div>

            {loadingData ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <div className="loader"></div>
              </div>
            ) : appointments.length === 0 ? (
              <div className={styles.emptyState}>
                <Calendar size={40} style={{ color: 'var(--accent-rose)', marginBottom: '10px' }} />
                <p>No tienes turnos registrados para {viewMode === 'day' ? 'esta fecha' : 'los próximos días'}.</p>
              </div>
            ) : (
              <div className={styles.appointmentsList}>
                {appointments.map((appt) => (
                  <div key={appt.id} className={styles.appointmentItem}>
                    <div className={styles.clientDetails}>
                      <div className={styles.timeBadge}>
                        <Clock size={14} style={{ display: 'block', margin: '0 auto 4px auto', color: 'var(--accent-gold)' }} />
                        {appt.appointment_time}
                      </div>
                      <div className={styles.clientInfo}>
                        <span className={styles.clientName}>{appt.client_name}</span>
                        <span className={styles.serviceBadge}>
                          {SERVICES_MAP[appt.service] || appt.service}
                        </span>
                        
                        {/* En modo "Ver todos", mostrar la fecha del turno */}
                        {viewMode === 'all' && (
                          <span style={{ fontSize: '0.85rem', color: 'var(--accent-rose)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Calendar size={12} />
                            {new Date(`${appt.appointment_date}T00:00:00`).toLocaleDateString('es-AR', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        )}

                        <div className={styles.clientContact}>
                          <a
                            href={getWhatsAppLink(appt.client_phone, appt.client_name, appt.appointment_date, appt.appointment_time)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.contactLink}
                          >
                            <Phone size={12} /> WhatsApp: {appt.client_phone}
                          </a>
                          {appt.client_email && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {appt.client_email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => handleCancelAppointment(appt.id, appt.client_name, appt.appointment_date, appt.appointment_time)}
                      disabled={actionLoading}
                      title="Cancelar turno"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Reviews Panel */}
      {activeTab === 'reviews' && (
        <div className="glass-card-gold animate-fade-in" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h2 className={styles.sectionTitle} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
              Moderación de Opiniones
            </h2>
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ padding: '8px 16px', fontSize: '0.8rem' }}
              onClick={fetchReviews}
              disabled={loadingReviews}
            >
              <RefreshCw size={14} className={loadingReviews ? 'animate-spin' : ''} /> Actualizar
            </button>
          </div>

          {loadingReviews ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div className="loader"></div>
            </div>
          ) : reviews.length === 0 ? (
            <div className={styles.emptyState}>
              <MessageSquare size={40} style={{ color: 'var(--accent-rose)', marginBottom: '10px' }} />
              <p>No hay opiniones registradas para moderar.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {reviews.map((rev) => (
                <div 
                  key={rev.id} 
                  className={styles.appointmentItem} 
                  style={{ 
                    borderLeft: rev.status === 'pending' ? '4px solid var(--accent-gold)' : '4px solid var(--success)',
                    gap: '20px'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span className={styles.clientName}>{rev.client_name}</span>
                      <span 
                        style={{ 
                          fontSize: '0.75rem', 
                          padding: '3px 8px', 
                          borderRadius: '12px', 
                          fontWeight: 600, 
                          backgroundColor: rev.status === 'pending' ? 'rgba(197, 168, 128, 0.15)' : 'rgba(136, 167, 131, 0.15)',
                          color: rev.status === 'pending' ? 'var(--accent-gold)' : 'var(--success)' 
                        }}
                      >
                        {rev.status === 'pending' ? 'Pendiente' : 'Aprobada'}
                      </span>
                      <span style={{ color: 'var(--accent-gold)', display: 'flex', gap: '2px', alignItems: 'center', fontSize: '0.95rem' }}>
                        <Star size={14} style={{ fill: 'var(--accent-gold)' }} />
                        <strong>{rev.rating}.0</strong>
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontStyle: 'italic', margin: '5px 0' }}>
                      "{rev.comment}"
                    </p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Enviado: {new Date(rev.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {rev.status === 'pending' && (
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        onClick={() => handleApproveReview(rev.id)}
                        disabled={actionLoading}
                      >
                        Aprobar
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => handleDeleteReview(rev.id)}
                      disabled={actionLoading}
                      title="Eliminar opinión"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Metrics & Sorteos Panel */}
      {activeTab === 'metrics' && (
        <div className="animate-fade-in">
          
          {/* KPI Dashboard Row */}
          <div className={styles.metricsGrid}>
            {/* KPI Hoy */}
            <div className={`${styles.metricCard} glass-card`}>
              <span className={styles.metricTitle}>Facturación Hoy</span>
              <span className={styles.metricValue}>
                {metrics ? formatMoney(metrics.today.revenue) : '$0'}
              </span>
              <div className={styles.metricDetail}>
                Turnos agendados: <span>{metrics ? metrics.today.count : 0}</span>
              </div>
            </div>

            {/* KPI Semana */}
            <div className={`${styles.metricCard} glass-card`}>
              <span className={styles.metricTitle}>Facturación Semanal</span>
              <span className={styles.metricValue}>
                {metrics ? formatMoney(metrics.week.revenue) : '$0'}
              </span>
              <div className={styles.metricDetail}>
                Turnos agendados: <span>{metrics ? metrics.week.count : 0}</span>
              </div>
            </div>

            {/* KPI Mes */}
            <div className={`${styles.metricCard} glass-card`}>
              <span className={styles.metricTitle}>Facturación Mensual</span>
              <span className={styles.metricValue}>
                {metrics ? formatMoney(metrics.month.revenue) : '$0'}
              </span>
              <div className={styles.metricDetail}>
                Turnos agendados: <span>{metrics ? metrics.month.count : 0}</span>
              </div>
            </div>
          </div>

          {/* Client Leaderboard / Ranking Section */}
          <div className="glass-card-gold" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h2 className={styles.sectionTitle} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '5px' }}>
                  Ranking de Clientas (Fidelización)
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Estas son las clientas que más han gastado. Ideal para realizar sorteos de fin de año o regalar beneficios especiales.
                </p>
              </div>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                onClick={fetchMetrics}
                disabled={loadingMetrics}
              >
                <RefreshCw size={14} className={loadingMetrics ? 'animate-spin' : ''} /> Actualizar
              </button>
            </div>

            {loadingMetrics ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <div className="loader"></div>
              </div>
            ) : ranking.length === 0 ? (
              <div className={styles.emptyState}>
                <Users size={40} style={{ color: 'var(--accent-rose)', marginBottom: '10px' }} />
                <p>Aún no hay suficientes datos para generar el ranking.</p>
              </div>
            ) : (
              <div className={styles.rankingTableWrapper}>
                <table className={styles.rankingTable}>
                  <thead>
                    <tr>
                      <th className={styles.rankingTh} style={{ width: '80px', textAlign: 'center' }}>Puesto</th>
                      <th className={styles.rankingTh}>Nombre de Clienta</th>
                      <th className={styles.rankingTh}>Teléfono</th>
                      <th className={styles.rankingTh} style={{ textAlign: 'center' }}>N° Visitas</th>
                      <th className={styles.rankingTh} style={{ textAlign: 'right' }}>Total Consumido</th>
                      <th className={styles.rankingTh} style={{ width: '100px', textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((client, idx) => {
                      const rank = idx + 1;
                      let rankClass = styles.rankingRank;
                      if (rank === 1) rankClass += ` ${styles.rank1}`;
                      else if (rank === 2) rankClass += ` ${styles.rank2}`;
                      else if (rank === 3) rankClass += ` ${styles.rank3}`;

                      return (
                        <tr key={client.client_phone} className={styles.rankingRow}>
                          <td className={styles.rankingTd} style={{ textAlign: 'center' }}>
                            <span className={rankClass}>{rank}</span>
                          </td>
                          <td className={styles.rankingTd} style={{ fontWeight: 600 }}>
                            {client.client_name}
                          </td>
                          <td className={styles.rankingTd}>
                            {client.client_phone}
                          </td>
                          <td className={styles.rankingTd} style={{ textAlign: 'center', fontWeight: 500 }}>
                            {client.visits_count}
                          </td>
                          <td className={styles.rankingTd} style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-gold)' }}>
                            {formatMoney(client.total_spent)}
                          </td>
                          <td className={styles.rankingTd} style={{ textAlign: 'center' }}>
                            <a
                              href={getSimpleWhatsAppLink(client.client_phone, client.client_name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.contactLink}
                              style={{ display: 'inline-flex', justifyContent: 'center' }}
                              title="Saludar por WhatsApp"
                            >
                              <Phone size={16} />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Services and Prices Panel */}
      {activeTab === 'services' && (
        <div className="glass-card-gold animate-fade-in" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h2 className={styles.sectionTitle} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '5px' }}>
                Precios de Servicios
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Modifica los precios aquí para que se actualicen inmediatamente en la landing page y en el sistema de reservas.
              </p>
            </div>
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ padding: '8px 16px', fontSize: '0.8rem' }}
              onClick={fetchServices}
              disabled={loadingServices}
            >
              <RefreshCw size={14} className={loadingServices ? 'animate-spin' : ''} /> Actualizar
            </button>
          </div>

          {loadingServices ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div className="loader"></div>
            </div>
          ) : (
            <form onSubmit={handleSavePrices}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
                
                {/* Categoría: Manicuría */}
                <div>
                  <h3 style={{ margin: '0 0 15px 0', borderLeft: '4px solid var(--accent-gold)', paddingLeft: '10px', fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--text-dark)' }}>
                    Servicios de Manicuría
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {servicesList.filter(s => s.category === 'manicura').map(service => (
                      <div key={service.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--white)', padding: '12px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-dark)' }}>{service.name}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Duración estimada: {service.duration}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.9rem' }}>$</span>
                          <input
                            type="number"
                            min="0"
                            required
                            style={{
                              padding: '8px 12px',
                              width: '110px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-color)',
                              textAlign: 'right',
                              fontSize: '0.95rem',
                              fontWeight: '600',
                              color: 'var(--text-dark)'
                            }}
                            value={service.price}
                            onChange={(e) => handlePriceChange(service.id, e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Categoría: Pedicuría */}
                <div>
                  <h3 style={{ margin: '0 0 15px 0', borderLeft: '4px solid var(--accent-gold)', paddingLeft: '10px', fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--text-dark)' }}>
                    Servicios de Pedicuría
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {servicesList.filter(s => s.category === 'pedicura').map(service => (
                      <div key={service.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--white)', padding: '12px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-dark)' }}>{service.name}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Duración estimada: {service.duration}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.9rem' }}>$</span>
                          <input
                            type="number"
                            min="0"
                            required
                            style={{
                              padding: '8px 12px',
                              width: '110px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-color)',
                              textAlign: 'right',
                              fontSize: '0.95rem',
                              fontWeight: '600',
                              color: 'var(--text-dark)'
                            }}
                            value={service.price}
                            onChange={(e) => handlePriceChange(service.id, e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingServices || servicesList.length === 0}
                  style={{ padding: '10px 24px', borderRadius: '30px', fontSize: '0.9rem' }}
                >
                  {savingServices ? 'Guardando...' : 'Guardar Precios'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
