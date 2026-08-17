'use client';

import { useState } from 'react';
import { RefreshCw, Search, Users, Phone, Mail, Calendar, DollarSign, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import styles from '@/styles/admin.module.css';

const TRUST_LABELS = {
  trusted: { label: 'Confiable', bg: 'rgba(136, 167, 131, 0.15)', color: 'var(--success)', Icon: ShieldCheck },
  restricted: { label: 'Restringida (seña)', bg: 'rgba(197, 168, 128, 0.18)', color: 'var(--accent-gold)', Icon: ShieldAlert },
  blocked: { label: 'Bloqueada', bg: 'rgba(203, 120, 112, 0.18)', color: 'var(--error)', Icon: ShieldX },
};

export default function ClientsTab({
  clients,
  loadingClients,
  fetchClients,
  actionLoading,
  onSetTrustStatus,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'visits', 'spent'

  const getSimpleWhatsAppLink = (phone, name) => {
    const cleanedPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`¡Hola ${name}! Te escribo desde Las Manitos de Mili. Espero que estés muy bien. ♥`);
    return `https://wa.me/${cleanedPhone}?text=${message}`;
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatLastVisit = (lastVisitStr) => {
    if (!lastVisitStr) return '-';
    try {
      const [datePart, timePart] = lastVisitStr.split(' ');
      const formattedDate = new Date(`${datePart}T00:00:00`).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      return `${formattedDate} a las ${timePart} hs`;
    } catch (e) {
      return lastVisitStr;
    }
  };

  // Filtrar
  const filteredClients = clients.filter(c => 
    (c.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.client_phone || '').includes(searchTerm)
  );

  // Ordenar
  const sortedClients = [...filteredClients].sort((a, b) => {
    if (sortBy === 'name') {
      return (a.client_name || '').localeCompare(b.client_name || '');
    } else if (sortBy === 'visits') {
      return b.visits_count - a.visits_count;
    } else if (sortBy === 'spent') {
      return b.total_spent - a.total_spent;
    }
    return 0;
  });

  return (
    <div className="glass-card-gold animate-fade-in" style={{ padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 className={styles.sectionTitle} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '5px' }}>
            Listado de Clientas Registradas
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Lista completa de clientas que han agendado al menos una vez en el sistema.
          </p>
        </div>
        <button 
          type="button" 
          className="btn-secondary" 
          style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          onClick={fetchClients}
          disabled={loadingClients}
        >
          <RefreshCw size={14} className={loadingClients ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {/* Tarjeta de Resumen */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', backgroundColor: 'var(--white)', padding: '15px 20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', width: 'fit-content' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-rose)' }}>
          <Users size={20} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dark)' }}>
            Total registradas: <strong style={{ fontSize: '1.1rem', color: 'var(--accent-gold)' }}>{clients.length}</strong>
          </span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Buscador */}
        <div style={{ position: 'relative', flexGrow: 1, minWidth: '200px' }}>
          <input
            type="text"
            className="input"
            style={{ paddingLeft: '35px', width: '100%' }}
            placeholder="Buscar por nombre o celular..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>

        {/* Ordenador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>Ordenar por:</label>
          <select
            className="input"
            style={{ width: 'auto', padding: '8px 12px', cursor: 'pointer' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Nombre (A-Z)</option>
            <option value="visits">N° de Visitas (Más visitas)</option>
            <option value="spent">Total Consumido (Mayor gasto)</option>
          </select>
        </div>
      </div>

      {loadingClients ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <div className="loader"></div>
        </div>
      ) : sortedClients.length === 0 ? (
        <div className={styles.emptyState}>
          <Users size={40} style={{ color: 'var(--accent-rose)', marginBottom: '10px' }} />
          <p>No se encontraron clientas que coincidan con la búsqueda.</p>
        </div>
      ) : (
        <div className={styles.rankingTableWrapper}>
          <table className={styles.rankingTable}>
            <thead>
              <tr>
                <th className={styles.rankingTh} style={{ width: '60px', textAlign: 'center' }}>#</th>
                <th className={styles.rankingTh}>Nombre de Clienta</th>
                <th className={styles.rankingTh}>Teléfono</th>
                <th className={styles.rankingTh}>Email</th>
                <th className={styles.rankingTh} style={{ textAlign: 'center' }}>N° Visitas</th>
                <th className={styles.rankingTh} style={{ textAlign: 'right' }}>Total Consumido</th>
                <th className={styles.rankingTh}>Última Visita</th>
                <th className={styles.rankingTh} style={{ textAlign: 'center' }}>Estado</th>
                <th className={styles.rankingTh} style={{ width: '140px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedClients.map((client, idx) => {
                const trustStatus = client.trust_status || 'trusted';
                const trustInfo = TRUST_LABELS[trustStatus] || TRUST_LABELS.trusted;
                const TrustIcon = trustInfo.Icon;
                const isOn = trustStatus === 'trusted';
                return (
                  <tr key={client.client_phone} className={styles.rankingRow}>
                    <td className={styles.rankingTd} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      {idx + 1}
                    </td>
                    <td className={styles.rankingTd} style={{ fontWeight: 600 }}>
                      {client.client_name}
                    </td>
                    <td className={styles.rankingTd}>
                      {client.client_phone}
                    </td>
                    <td className={styles.rankingTd} style={{ fontSize: '0.85rem' }}>
                      {client.client_email ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={12} /> {client.client_email}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td className={styles.rankingTd} style={{ textAlign: 'center', fontWeight: 500 }}>
                      {client.visits_count}
                    </td>
                    <td className={styles.rankingTd} style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-gold)' }}>
                      {formatMoney(client.total_spent)}
                    </td>
                    <td className={styles.rankingTd} style={{ fontSize: '0.82rem' }}>
                      {formatLastVisit(client.last_visit)}
                    </td>
                    <td className={styles.rankingTd} style={{ textAlign: 'center' }}>
                      <span
                        title={
                          trustStatus === 'trusted'
                            ? 'Clienta confiable, sin restricciones'
                            : trustStatus === 'restricted'
                            ? 'Debe pagar seña y esperar aprobación para su próximo turno'
                            : 'No puede reservar turnos online'
                        }
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.72rem',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontWeight: 600,
                          backgroundColor: trustInfo.bg,
                          color: trustInfo.color,
                        }}
                      >
                        <TrustIcon size={12} /> {trustInfo.label}
                      </span>
                    </td>
                    <td className={styles.rankingTd}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
                        <a
                          href={getSimpleWhatsAppLink(client.client_phone, client.client_name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.contactLink}
                          style={{ display: 'inline-flex', justifyContent: 'center' }}
                          title="Enviar WhatsApp"
                        >
                          <Phone size={16} />
                        </a>

                        {trustStatus !== 'blocked' && (
                          <label
                            className={styles.switch}
                            title={isOn ? 'Confiable: apagá si faltó sin avisar' : 'Restringida: se le pedirá seña en su próximo turno'}
                          >
                            <input
                              type="checkbox"
                              checked={isOn}
                              onChange={() => onSetTrustStatus(client.client_phone, isOn ? 'restricted' : 'trusted')}
                              disabled={actionLoading}
                            />
                            <span className={styles.slider}></span>
                          </label>
                        )}

                        <button
                          type="button"
                          onClick={() => onSetTrustStatus(client.client_phone, trustStatus === 'blocked' ? 'trusted' : 'blocked')}
                          disabled={actionLoading}
                          style={{
                            background: 'none',
                            border: '1px solid ' + (trustStatus === 'blocked' ? 'var(--success)' : 'var(--error)'),
                            color: trustStatus === 'blocked' ? 'var(--success)' : 'var(--error)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '4px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title={trustStatus === 'blocked' ? 'Desbloquear clienta' : 'Bloquear clienta por completo (reincidente)'}
                        >
                          {trustStatus === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
