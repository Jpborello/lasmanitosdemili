'use client';

import { RefreshCw, Users, Phone } from 'lucide-react';
import styles from '@/styles/admin.module.css';

export default function MetricsTab({
  metrics,
  ranking,
  loadingMetrics,
  fetchMetrics,
}) {
  const getSimpleWhatsAppLink = (phone, name) => {
    const cleanedPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`¡Hola ${name}! Te escribo desde Las Manitos de Mili para saludarte y agradecerte por ser una de nuestras clientas más fieles. ♥`);
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
  );
}
