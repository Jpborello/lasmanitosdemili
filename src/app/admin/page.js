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
  const [extraSlots, setExtraSlots] = useState([]);
  const [mpEnabled, setMpEnabled] = useState(false);
  const [mpAccessToken, setMpAccessToken] = useState('');
  const [mpPublicKey, setMpPublicKey] = useState('');
  const [mpDepositAmount, setMpDepositAmount] = useState(2000);
  const [restrictedDepositAmount, setRestrictedDepositAmount] = useState(5000);
  const [depositPaymentInstructions, setDepositPaymentInstructions] = useState('');

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
        if (data.extra_slots !== undefined) {
          const list = data.extra_slots.split(',').map(s => s.trim()).filter(Boolean);
          setExtraSlots(list);
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
        if (data.restricted_deposit_amount !== undefined) {
          setRestrictedDepositAmount(data.restricted_deposit_amount);
        }
        if (data.deposit_payment_instructions !== undefined) {
          setDepositPaymentInstructions(data.deposit_payment_instructions);
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

      const res = await fetch(url, { cache: 'no-store' });
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
      const res = await fetch('/api/admin/reviews', { cache: 'no-store' });
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
      const res = await fetch('/api/admin/metrics', { cache: 'no-store' });
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
      const res = await fetch('/api/admin/services', { cache: 'no-store' });
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
      const res = await fetch('/api/admin/clients', { cache: 'no-store' });
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

  // Agregar un horario extra (fecha + hora puntual, fuera del horario fijo habitual)
  const handleAddExtraSlot = async (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return;

    const slotKey = `${dateStr}_${timeStr}`;
    if (extraSlots.includes(slotKey)) {
      alert('Ese horario extra ya está agregado para esta fecha.');
      return;
    }

    setActionLoading(true);
    try {
      const nextExtra = [...extraSlots, slotKey];
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extra_slots: nextExtra.join(',') }),
      });

      if (res.ok) {
        setExtraSlots(nextExtra);
      } else {
        alert('No se pudo agregar el horario extra.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al agregar el horario extra.');
    } finally {
      setActionLoading(false);
    }
  };

  // Quitar un horario extra
  const handleRemoveExtraSlot = async (slotKey) => {
    setActionLoading(true);
    try {
      const nextExtra = extraSlots.filter(s => s !== slotKey);
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extra_slots: nextExtra.join(',') }),
      });

      if (res.ok) {
        setExtraSlots(nextExtra);
      } else {
        alert('No se pudo quitar el horario extra.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al quitar el horario extra.');
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

  // Guardar configuración de seña para clientas restringidas
  const handleSaveDepositSettings = async (config) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.restricted_deposit_amount !== undefined) setRestrictedDepositAmount(data.restricted_deposit_amount);
        if (data.deposit_payment_instructions !== undefined) setDepositPaymentInstructions(data.deposit_payment_instructions);
        alert('Configuración de seña guardada exitosamente.');
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

  // 8b. Marcar/desmarcar un turno como no-show (clienta no se presentó)
  const handleMarkNoShow = async (id, markAsNoShow) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/appointments?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: markAsNoShow ? 'no_show' : 'confirmed' }),
      });

      if (res.ok) {
        fetchAppointments();
      } else {
        alert('No se pudo actualizar el turno.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    } finally {
      setActionLoading(false);
    }
  };

  // 8c. Aprobar una seña pendiente (confirma el turno y avisa a la clienta)
  const handleApproveDeposit = async (id) => {
    const appt = appointments.find(a => a.id === id);
    const confirmApprove = window.confirm(
      appt ? `¿Confirmás que ${appt.client_name} pagó la seña? Se le avisará por WhatsApp que su turno quedó confirmado.` : '¿Confirmás la seña de este turno?'
    );
    if (!confirmApprove) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/appointments?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });

      if (res.ok) {
        fetchAppointments();
      } else {
        alert('No se pudo aprobar la seña.');
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

  // 11b. Cambiar manualmente el estado de confianza de una clienta (switch on/off + bloqueo)
  const handleSetClientTrustStatus = async (phone, trustStatus) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, trust_status: trustStatus }),
      });

      if (res.ok) {
        setClientsList(prev => prev.map(c => c.client_phone === phone ? { ...c, trust_status: trustStatus } : c));
      } else {
        alert('No se pudo actualizar el estado de la clienta.');
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
      <nav className={styles.tabsNav}>
        {[
          { key: 'appointments', label: 'Gestionar Turnos' },
          { key: 'reviews', label: 'Gestionar Opiniones' },
          { key: 'metrics', label: 'Métricas y Sorteos' },
          { key: 'clients', label: 'Gestionar Clientas' },
          { key: 'services', label: 'Precios y Servicios' },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tabBtn} ${activeTab === tab.key ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab 1: Appointments Panel */}
      {activeTab === 'appointments' && (
        <div className={`${styles.dashboardGrid} animate-fade-in`}>
          <SettingsTab
            enable18Weekday={enable18Weekday}
            blockedWeekdays={blockedWeekdays}
            blockedDates={blockedDates}
            blockedSlots={blockedSlots}
            extraSlots={extraSlots}
            mpEnabled={mpEnabled}
            mpAccessToken={mpAccessToken}
            mpPublicKey={mpPublicKey}
            mpDepositAmount={mpDepositAmount}
            restrictedDepositAmount={restrictedDepositAmount}
            depositPaymentInstructions={depositPaymentInstructions}
            actionLoading={actionLoading}
            onToggle18={handleToggle18}
            onToggleWeekday={handleToggleWeekday}
            onAddBlockedDate={handleAddBlockedDate}
            onRemoveBlockedDate={handleRemoveBlockedDate}
            onAddBlockedSlot={handleAddBlockedSlot}
            onRemoveBlockedSlot={handleRemoveBlockedSlot}
            onAddExtraSlot={handleAddExtraSlot}
            onRemoveExtraSlot={handleRemoveExtraSlot}
            onSaveMercadoPago={handleSaveMercadoPago}
            onSaveDepositSettings={handleSaveDepositSettings}
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
            handleMarkNoShow={handleMarkNoShow}
            handleApproveDeposit={handleApproveDeposit}
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
          actionLoading={actionLoading}
          onSetTrustStatus={handleSetClientTrustStatus}
        />
      )}
    </div>
  );
}
