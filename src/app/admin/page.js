'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, ExternalLink } from 'lucide-react';
import styles from '@/styles/admin.module.css';

import AppointmentsTab from '@/components/admin/AppointmentsTab';
import SettingsTab from '@/components/admin/SettingsTab';
import ReviewsTab from '@/components/admin/ReviewsTab';
import MetricsTab from '@/components/admin/MetricsTab';
import ServicesTab from '@/components/admin/ServicesTab';
import ClientsTab from '@/components/admin/ClientsTab';

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
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [mpEnabled, setMpEnabled] = useState(false);
  const [mpAccessToken, setMpAccessToken] = useState('');
  const [mpPublicKey, setMpPublicKey] = useState('');
  const [mpDepositAmount, setMpDepositAmount] = useState(2000);
  
  // Clients State
  const [clientsList, setClientsList] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  
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
        if (data.blocked_slots !== undefined) {
          const list = data.blocked_slots.split(',').map(s => s.trim()).filter(Boolean);
          setBlockedSlots(list);
        }
        if (data.mp_enabled !== undefined) {
          setMpEnabled(data.mp_enabled);
        }
        if (data.mp_access_token !== undefined) {
          setMpAccessToken(data.mp_access_token);
        }
        if (data.mp_public_key !== undefined) {
          setMpPublicKey(data.mp_public_key);
        }
        if (data.mp_deposit_amount !== undefined) {
          setMpDepositAmount(data.mp_deposit_amount);
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
      setTimeout(fetchAppointments, 0);
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
      setTimeout(fetchReviews, 0);
    }
  }, [activeTab, authenticated]);

  // 5. Obtener métricas y ranking
  const fetchMetrics = async () => {
    if (!authenticated) return;
    setLoadingMetrics(true);
    try {
      const res = await fetch('/api/admin/metrics');
      const data = await res.json();
      if (data.metrics) {
        setMetrics(data.metrics);
      }
      if (data.ranking) {
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
      setTimeout(fetchMetrics, 0);
    }
  }, [activeTab, authenticated]);

  // 6. Obtener servicios
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
      setTimeout(fetchServices, 0);
    }
  }, [activeTab, authenticated]);

  // 12. Obtener listado de clientas
  const fetchClients = async () => {
    if (!authenticated) return;
    setLoadingClients(true);
    try {
      const res = await fetch('/api/admin/clients');
      const data = await res.json();
      if (data.clients) {
        setClientsList(data.clients);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'clients' && authenticated) {
      setTimeout(fetchClients, 0);
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
  const handleAddBlockedDate = async (dateStr) => {
    if (!dateStr) return;

    if (blockedDates.includes(dateStr)) {
      alert('Esta fecha ya está bloqueada.');
      return;
    }

    setActionLoading(true);
    try {
      const nextBlocked = [...blockedDates, dateStr];
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_dates: nextBlocked.join(',') }),
      });

      if (res.ok) {
        setBlockedDates(nextBlocked);
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

  // Bloquear un horario específico (fecha + hora)
  const handleAddBlockedSlot = async (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return;

    const slotKey = `${dateStr}_${timeStr}`;
    if (blockedSlots.includes(slotKey)) {
      alert('Este horario ya está bloqueado en esta fecha.');
      return;
    }

    setActionLoading(true);
    try {
      const nextBlocked = [...blockedSlots, slotKey];
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_slots: nextBlocked.join(',') }),
      });

      if (res.ok) {
        setBlockedSlots(nextBlocked);
      } else {
        alert('No se pudo bloquear el horario.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al bloquear.');
    } finally {
      setActionLoading(false);
    }
  };

  // Desbloquear un horario específico
  const handleRemoveBlockedSlot = async (slotKey) => {
    const [dateStr, timeStr] = slotKey.split('_');
    const formattedDate = new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    
    const confirmUnlock = window.confirm(`¿Estás segura de que deseas desbloquear el horario de las ${timeStr}hs el día ${formattedDate}?`);
    if (!confirmUnlock) return;

    setActionLoading(true);
    try {
      const nextBlocked = blockedSlots.filter(s => s !== slotKey);
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_slots: nextBlocked.join(',') }),
      });

      if (res.ok) {
        setBlockedSlots(nextBlocked);
      } else {
        alert('No se pudo desbloquear el horario.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al desbloquear.');
    } finally {
      setActionLoading(false);
    }
  };

  // Guardar configuración de Mercado Pago
  const handleSaveMercadoPago = async (config) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.mp_enabled !== undefined) setMpEnabled(data.mp_enabled);
        if (data.mp_access_token !== undefined) setMpAccessToken(data.mp_access_token);
        if (data.mp_public_key !== undefined) setMpPublicKey(data.mp_public_key);
        if (data.mp_deposit_amount !== undefined) setMpDepositAmount(data.mp_deposit_amount);
        alert('Configuración de Mercado Pago guardada exitosamente.');
      } else {
        alert(data.error || 'Error al guardar configuración.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Cancelar un turno
  const handleCancelAppointment = async (id) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;

    const formattedDate = new Date(`${appt.appointment_date}T00:00:00`).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short'
    });

    const confirmCancel = window.confirm(
      `¿Estás segura de que deseas cancelar el turno de ${appt.client_name} el día ${formattedDate} a las ${appt.appointment_time}hs?`
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

  return (
    <div className="container" style={{ padding: '40px 24px', minHeight: '100vh' }}>
      {/* Header */}
      <header className={styles.dashboardHeader}>
        <div className={styles.adminTitle}>
          Las Manitos de Mili <span>Panel de Control</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link href="/" className={styles.webBtn}>
            <ExternalLink size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Volver a la Web
          </Link>
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
            color: activeTab === 'clients' ? 'var(--text-dark)' : 'var(--text-muted)',
            borderBottom: activeTab === 'clients' ? '2px solid var(--accent-rose)' : 'none',
            transition: 'var(--transition-smooth)'
          }}
          onClick={() => setActiveTab('clients')}
        >
          Gestionar Clientas
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
          <SettingsTab
            enable18Weekday={enable18Weekday}
            blockedWeekdays={blockedWeekdays}
            blockedDates={blockedDates}
            blockedSlots={blockedSlots}
            mpEnabled={mpEnabled}
            mpAccessToken={mpAccessToken}
            mpPublicKey={mpPublicKey}
            mpDepositAmount={mpDepositAmount}
            actionLoading={actionLoading}
            onToggle18={handleToggle18}
            onToggleWeekday={handleToggleWeekday}
            onAddBlockedDate={handleAddBlockedDate}
            onRemoveBlockedDate={handleRemoveBlockedDate}
            onAddBlockedSlot={handleAddBlockedSlot}
            onRemoveBlockedSlot={handleRemoveBlockedSlot}
            onSaveMercadoPago={handleSaveMercadoPago}
          />
          <AppointmentsTab
            appointments={appointments}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            viewMode={viewMode}
            setViewMode={setViewMode}
            loadingData={loadingData}
            fetchAppointments={fetchAppointments}
            handleCancelAppointment={handleCancelAppointment}
            actionLoading={actionLoading}
          />
        </div>
      )}

      {/* Tab 2: Reviews Panel */}
      {activeTab === 'reviews' && (
        <ReviewsTab
          reviews={reviews}
          loadingReviews={loadingReviews}
          fetchReviews={fetchReviews}
          handleApproveReview={handleApproveReview}
          handleDeleteReview={handleDeleteReview}
          actionLoading={actionLoading}
        />
      )}

      {/* Tab 3: Metrics & Sorteos Panel */}
      {activeTab === 'metrics' && (
        <MetricsTab
          metrics={metrics}
          ranking={ranking}
          loadingMetrics={loadingMetrics}
          fetchMetrics={fetchMetrics}
        />
      )}

      {/* Tab 4: Services and Prices Panel */}
      {activeTab === 'services' && (
        <ServicesTab
          servicesList={servicesList}
          loadingServices={loadingServices}
          savingServices={savingServices}
          fetchServices={fetchServices}
          handleSavePrices={handleSavePrices}
          handlePriceChange={handlePriceChange}
        />
      )}

      {/* Tab 5: Clients Panel */}
      {activeTab === 'clients' && (
        <ClientsTab
          clients={clientsList}
          loadingClients={loadingClients}
          fetchClients={fetchClients}
        />
      )}
    </div>
  );
}
