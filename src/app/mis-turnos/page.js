'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Calendar, Clock, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import styles from '@/styles/booking.module.css';
import { useClientSession } from '@/hooks/useClientSession';
import { DEFAULT_SERVICES } from '@/lib/constants';

const STATUS_INFO = {
  confirmed: { label: 'Confirmado', color: 'var(--success)', icon: CheckCircle2 },
  pending_deposit: { label: 'A la espera de la seña', color: 'var(--accent-gold)', icon: ShieldAlert },
  pending_payment: { label: 'A la espera del pago', color: 'var(--accent-gold)', icon: ShieldAlert },
  no_show: { label: 'No asistió', color: 'var(--error)', icon: XCircle },
};

function getStatusInfo(status) {
  return STATUS_INFO[status] || { label: status || 'Confirmado', color: 'var(--success)', icon: CheckCircle2 };
}

export default function MisTurnosPage() {
  const { clientPhone, setClientPhone } = useClientSession();
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneInputInitialized, setPhoneInputInitialized] = useState(false);
  const [servicesList, setServicesList] = useState(DEFAULT_SERVICES);
  const [appointments, setAppointments] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  // Prellenar el teléfono con el guardado en este dispositivo (si ya reservó antes)
  if (!phoneInputInitialized && clientPhone) {
    setPhoneInputInitialized(true);
    setPhoneInput(clientPhone);
  }

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const [apptsRes, servicesRes] = await Promise.all([
        fetch(`/api/appointments/mine?phone=${encodeURIComponent(phoneInput.trim())}`, { cache: 'no-store' }),
        fetch('/api/admin/services', { cache: 'no-store' }),
      ]);

      const apptsData = await apptsRes.json();
      if (!apptsRes.ok) {
        throw new Error(apptsData.error || 'No pudimos buscar tus turnos');
      }

      const servicesData = await servicesRes.json();
      if (servicesData.services && servicesData.services.length > 0) {
        setServicesList(servicesData.services);
      }

      setAppointments(apptsData.appointments || []);
      setClientPhone(phoneInput.trim());
    } catch (err) {
      setError(err.message);
      setAppointments(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
  const upcoming = (appointments || []).filter(a => a.appointment_date >= todayStr && a.status !== 'no_show');
  const past = (appointments || []).filter(a => a.appointment_date < todayStr || a.status === 'no_show');

  const renderAppointment = (appt) => {
    const serviceDetails = servicesList.find(s => s.id === appt.service);
    const statusInfo = getStatusInfo(appt.status);
    const StatusIcon = statusInfo.icon;

    return (
      <div
        key={appt.id}
        className="glass-card"
        style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <Calendar size={16} style={{ color: 'var(--accent-rose)' }} />
            <span style={{ textTransform: 'capitalize' }}>{formatDate(appt.appointment_date)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: statusInfo.color }}>
            <StatusIcon size={15} />
            {statusInfo.label}
          </div>
        </div>

        <div className={styles.ticketDetails} style={{ marginTop: 0 }}>
          <div className={styles.ticketRow}>
            <span className={styles.ticketLabel}>Horario:</span>
            <span className={styles.ticketValue} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} /> {appt.appointment_time} hs
            </span>
          </div>
          <div className={styles.ticketRow}>
            <span className={styles.ticketLabel}>Servicio:</span>
            <span className={styles.ticketValue}>{serviceDetails?.name || appt.service}</span>
          </div>
          <div className={styles.ticketRow}>
            <span className={styles.ticketLabel}>Precio:</span>
            <span className={styles.ticketValue}>${new Intl.NumberFormat('es-AR').format(appt.price || 0)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px' }}>
      <div style={{ width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '6px' }}>Mis Turnos</h1>
          <p className={styles.selectedDateText}>
            Ingresá el teléfono con el que reservaste para ver el estado de tus turnos.
          </p>
        </div>

        <form onSubmit={handleSearch} className="glass-card-gold" style={{ padding: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="tel"
            className={styles.input}
            style={{ flex: '1 1 220px' }}
            placeholder="Ej. 11 2345 6789"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <Search size={16} />
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {error && (
          <p style={{ color: 'var(--error)', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }}>{error}</p>
        )}

        {searched && !loading && !error && appointments && appointments.length === 0 && (
          <p className={styles.selectedDateText} style={{ textAlign: 'center' }}>
            No encontramos turnos registrados con ese número.
          </p>
        )}

        {upcoming.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: '1.1rem' }}>Próximos turnos</h2>
            {upcoming.map(renderAppointment)}
          </div>
        )}

        {past.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
            <h2 style={{ fontSize: '1.1rem' }}>Historial</h2>
            {past.map(renderAppointment)}
          </div>
        )}

        <Link href="/" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
          ← Volver a la web
        </Link>
      </div>
    </main>
  );
}
