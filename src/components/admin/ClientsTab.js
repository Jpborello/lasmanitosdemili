'use client';

import { useState } from 'react';
import { RefreshCw, Search, Users, Phone, Mail, Calendar, DollarSign, ShieldCheck, ShieldAlert, ShieldX, Pencil, X, PhoneOff } from 'lucide-react';
import styles from '@/styles/admin.module.css';
import { isNoPhone } from '@/lib/phone';

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
  onEditClient,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'visits', 'spent'
  const [editingClient, setEditingClient] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '' });
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditModal = (client) => {
    setEditingClient(client);
    setEditForm({
      name: client.client_name || '',
      phone: isNoPhone(client.client_phone) ? '' : client.client_phone || '',
      email: client.client_email || '',
    });
    setEditError('');
  };

  const closeEditModal = () => {
    setEditingClient(null);
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editingClient) return;

    if (!editForm.name.trim()) {
      setEditError('El nombre no puede estar vacío.');
      return;
    }

    const hasNoPhoneOriginally = isNoPhone(editingClient.client_phone);
    const cleanPhone = editForm.phone.replace(/\D/g, '').replace(/^0+/, '');

    if (!cleanPhone && !hasNoPhoneOriginally) {
      setEditError('Ingresá un teléfono válido.');
      return;
    }

    if (cleanPhone && cleanPhone.length < 8) {
      setEditError('Ingresá un teléfono válido (mínimo 8 dígitos).');
      return;
    }

    setSavingEdit(true);
    setEditError('');

    const result = await onEditClient(editingClient.client_phone, {
      name: editForm.name,
      email: editForm.email,
      ...(cleanPhone ? { new_phone: cleanPhone } : {}),
    });

    setSavingEdit(false);

    if (result?.success) {
      closeEditModal();
    } else {
      setEditError(result?.error || 'No se pudo guardar los cambios.');
    }
  };

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
    <>
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
                      {isNoPhone(client.client_phone) ? (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.82rem' }}>
                          Sin celular
                        </span>
                      ) : (
                        client.client_phone
                      )}
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
                        {isNoPhone(client.client_phone) ? (
                          <span
                            className={styles.contactLink}
                            style={{ opacity: 0.35, cursor: 'not-allowed', display: 'inline-flex', justifyContent: 'center' }}
                            title="Sin celular registrado"
                          >
                            <PhoneOff size={16} />
                          </span>
                        ) : (
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
                        )}

                        <button
                          type="button"
                          onClick={() => openEditModal(client)}
                          disabled={actionLoading}
                          className={styles.contactLink}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', justifyContent: 'center', padding: 0 }}
                          title="Editar nombre, teléfono o email"
                        >
                          <Pencil size={16} />
                        </button>

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

    {editingClient && (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(44, 34, 32, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}
        onClick={closeEditModal}
      >
        <div
          className="glass-card-gold animate-fade-in"
          style={{ padding: '30px', width: '100%', maxWidth: '420px', position: 'relative' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={closeEditModal}
            style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            title="Cerrar"
          >
            <X size={20} />
          </button>

          <h3 className={styles.sectionTitle} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '20px', fontSize: '1.3rem' }}>
            Editar Clienta
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                Nombre
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                disabled={savingEdit}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                Teléfono
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                disabled={savingEdit}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                Email (opcional)
              </label>
              <input
                type="email"
                className="input"
                style={{ width: '100%' }}
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                disabled={savingEdit}
              />
            </div>

            {editError && (
              <p style={{ color: 'var(--error)', fontSize: '0.85rem', margin: 0 }}>{editError}</p>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={closeEditModal}
                disabled={savingEdit}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
