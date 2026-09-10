'use client';

import { 
  RefreshCw, 
  Users, 
  Phone, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign 
} from 'lucide-react';
import styles from '@/styles/admin.module.css';

// Escapa un valor para que sea seguro incluirlo en una celda CSV
function escapeCsvValue(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

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
    }).format(amount || 0);
  };

  // Genera y descarga un CSV con el resumen financiero, histórico mensual y ranking
  const handleExportCSV = () => {
    if (!metrics) return;

    const rows = [];
    rows.push(['Reporte de Métricas - Las Manitos de Mili']);
    rows.push([`Generado el ${new Date().toLocaleString('es-AR')}`]);
    rows.push([]);
    rows.push(['Resumen de Facturación Rápida']);
    rows.push(['Período', 'Turnos', 'Recaudación (ARS)', 'No-shows']);
    rows.push(['Hoy', metrics.today.count, metrics.today.revenue, metrics.today.noShowCount || 0]);
    rows.push(['Semana actual', metrics.week.count, metrics.week.revenue, metrics.week.noShowCount || 0]);
    rows.push([`Mes en curso (${metrics.month.label || metrics.month.period})`, metrics.month.count, metrics.month.revenue, metrics.month.noShowCount || 0]);
    if (metrics.previousMonth) {
      rows.push([`Mes anterior (${metrics.previousMonth.label || metrics.previousMonth.period})`, metrics.previousMonth.count, metrics.previousMonth.revenue, metrics.previousMonth.noShowCount || 0]);
    }
    rows.push([]);

    // Sección Historial Mensual
    if (metrics.history && metrics.history.length > 0) {
      rows.push(['Historial y Comparativa Mensual']);
      rows.push(['Período', 'Estado', 'Turnos Atendidos', 'No-shows', 'Ticket Promedio (ARS)', 'Recaudación Total (ARS)', 'Variación %']);
      metrics.history.forEach((m) => {
        const estado = m.isCurrent ? 'Mes actual' : m.isPrevious ? 'Mes anterior' : m.isFuture ? 'Reservas' : 'Cerrado';
        const variacion = m.growthPercent !== null ? `${m.growthPercent > 0 ? '+' : ''}${m.growthPercent}%` : '—';
        rows.push([m.label || m.period, estado, m.count, m.noShowCount, m.avgTicket, m.revenue, variacion]);
      });
      rows.push([]);
    }

    // Sección Ranking de Clientas
    rows.push(['Ranking de Clientas Fieles']);
    rows.push(['Puesto', 'Nombre', 'Teléfono', 'N° Visitas', 'Total Consumido (ARS)']);
    ranking.forEach((client, idx) => {
      rows.push([idx + 1, client.client_name, client.client_phone, client.visits_count, client.total_spent]);
    });

    const csvContent = rows.map(row => row.map(escapeCsvValue).join(',')).join('\n');
    // El BOM al inicio asegura que Excel abra los acentos y caracteres especiales correctamente
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `metricas-lasmanitosdemili-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const historyList = metrics?.history || [];

  return (
    <div className="animate-fade-in">
      {/* Botones y acciones de cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          Métricas financieras actualizadas en tiempo real según los turnos agendados.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button" 
            className="btn-secondary" 
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
            onClick={fetchMetrics}
            disabled={loadingMetrics}
          >
            <RefreshCw size={14} className={loadingMetrics ? 'animate-spin' : ''} /> Actualizar
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
            onClick={handleExportCSV}
            disabled={!metrics}
            title="Descargar recaudación, historial mensual y ranking en archivo CSV para Excel"
          >
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* KPI Dashboard Row: 4 tarjetas comparativas */}
      <div className={styles.metricsGrid}>
        {/* KPI 1: Hoy */}
        <div className={`${styles.metricCard} glass-card`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Facturación Hoy</span>
          </div>
          <span className={styles.metricValue}>
            {metrics ? formatMoney(metrics.today.revenue) : '$0'}
          </span>
          <div className={styles.metricDetail}>
            <span>Turnos: <strong>{metrics ? metrics.today.count : 0}</strong></span>
            {metrics && metrics.today.noShowCount > 0 && (
              <span style={{ color: 'var(--error)' }}>No-shows: <strong>{metrics.today.noShowCount}</strong></span>
            )}
          </div>
        </div>

        {/* KPI 2: Semana actual */}
        <div className={`${styles.metricCard} glass-card`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Semana Actual</span>
          </div>
          <span className={styles.metricValue}>
            {metrics ? formatMoney(metrics.week.revenue) : '$0'}
          </span>
          <div className={styles.metricDetail}>
            <span>Turnos: <strong>{metrics ? metrics.week.count : 0}</strong></span>
            {metrics && metrics.week.noShowCount > 0 && (
              <span style={{ color: 'var(--error)' }}>No-shows: <strong>{metrics.week.noShowCount}</strong></span>
            )}
          </div>
        </div>

        {/* KPI 3: Mes en curso (con indicador de variación vs mes anterior) */}
        <div className={`${styles.metricCard} glass-card`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>
              {metrics?.month?.label || 'Mes en Curso'}
            </span>
            {metrics?.month?.growthVsPrev !== null && metrics?.month?.growthVsPrev !== undefined && (
              <span 
                className={`${styles.trendBadge} ${metrics.month.growthVsPrev >= 0 ? styles.trendUp : styles.trendDown}`}
                title={`Variación respecto al mes anterior (${formatMoney(metrics.month.diffVsPrev)})`}
              >
                {metrics.month.growthVsPrev >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {metrics.month.growthVsPrev >= 0 ? `+${metrics.month.growthVsPrev}%` : `${metrics.month.growthVsPrev}%`}
              </span>
            )}
          </div>
          <span className={styles.metricValue}>
            {metrics ? formatMoney(metrics.month.revenue) : '$0'}
          </span>
          <div className={styles.metricDetail}>
            <span>Turnos: <strong>{metrics ? metrics.month.count : 0}</strong></span>
            {metrics && metrics.month.noShowCount > 0 && (
              <span style={{ color: 'var(--error)' }}>No-shows: <strong>{metrics.month.noShowCount}</strong></span>
            )}
          </div>
        </div>

        {/* KPI 4: Mes anterior cerrado */}
        <div className={`${styles.metricCard} glass-card`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>
              {metrics?.previousMonth?.label ? `Mes Anterior (${metrics.previousMonth.label})` : 'Mes Anterior'}
            </span>
            <span className={`${styles.statusBadge} ${styles.statusPrevious}`}>
              Cerrado
            </span>
          </div>
          <span className={styles.metricValue}>
            {metrics ? formatMoney(metrics.previousMonth?.revenue) : '$0'}
          </span>
          <div className={styles.metricDetail}>
            <span>Turnos: <strong>{metrics ? metrics.previousMonth?.count : 0}</strong></span>
            <span>Ticket prom.: <strong>{metrics ? formatMoney(metrics.previousMonth?.avgTicket) : '$0'}</strong></span>
          </div>
        </div>
      </div>

      {/* Historial Mensual Comparativo Section */}
      <div className="glass-card" style={{ padding: '30px', marginBottom: '35px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 className={styles.sectionTitle} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '5px' }}>
              Historial y Comparativa Mensual
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Evolución de ganancias mes a mes con porcentaje de crecimiento, cantidad de clientas atendidas y ticket promedio.
            </p>
          </div>
        </div>

        {loadingMetrics ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div className="loader"></div>
          </div>
        ) : historyList.length === 0 ? (
          <div className={styles.emptyState}>
            <Calendar size={40} style={{ color: 'var(--accent-gold)', marginBottom: '10px' }} />
            <p>Aún no hay suficientes meses registrados en el sistema.</p>
          </div>
        ) : (
          <div className={styles.rankingTableWrapper}>
            <table className={styles.rankingTable}>
              <thead>
                <tr>
                  <th className={styles.rankingTh}>Período</th>
                  <th className={styles.rankingTh} style={{ textAlign: 'center' }}>Estado</th>
                  <th className={styles.rankingTh} style={{ textAlign: 'center' }}>Turnos</th>
                  <th className={styles.rankingTh} style={{ textAlign: 'center' }}>No-shows</th>
                  <th className={styles.rankingTh} style={{ textAlign: 'right' }}>Ticket Promedio</th>
                  <th className={styles.rankingTh} style={{ textAlign: 'right' }}>Recaudación Total</th>
                  <th className={styles.rankingTh} style={{ textAlign: 'center' }}>Crecimiento</th>
                </tr>
              </thead>
              <tbody>
                {historyList.map((item) => {
                  let statusBadge = null;
                  if (item.isCurrent) {
                    statusBadge = <span className={`${styles.statusBadge} ${styles.statusCurrent}`}>Mes en curso</span>;
                  } else if (item.isPrevious) {
                    statusBadge = <span className={`${styles.statusBadge} ${styles.statusPrevious}`}>Mes anterior</span>;
                  } else if (item.isFuture) {
                    statusBadge = <span className={`${styles.statusBadge} ${styles.statusFuture}`}>Reservas</span>;
                  } else {
                    statusBadge = <span className={`${styles.statusBadge} ${styles.statusClosed}`}>Cerrado</span>;
                  }

                  let growthBadge = <span className={`${styles.trendBadge} ${styles.trendNeutral}`}>—</span>;
                  if (item.growthPercent !== null) {
                    const isPositive = item.growthPercent >= 0;
                    growthBadge = (
                      <span 
                        className={`${styles.trendBadge} ${isPositive ? styles.trendUp : styles.trendDown}`}
                        title={item.diffAmount !== null ? `Diferencia: ${formatMoney(item.diffAmount)} vs mes anterior` : undefined}
                      >
                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {isPositive ? `+${item.growthPercent}%` : `${item.growthPercent}%`}
                      </span>
                    );
                  }

                  return (
                    <tr key={item.period} className={styles.rankingRow}>
                      <td className={styles.rankingTd} style={{ fontWeight: 600 }}>
                        {item.label}
                      </td>
                      <td className={styles.rankingTd} style={{ textAlign: 'center' }}>
                        {statusBadge}
                      </td>
                      <td className={styles.rankingTd} style={{ textAlign: 'center', fontWeight: 500 }}>
                        {item.count}
                      </td>
                      <td className={styles.rankingTd} style={{ textAlign: 'center' }}>
                        {item.noShowCount > 0 ? (
                          <span style={{ color: 'var(--error)', fontWeight: 600 }}>{item.noShowCount}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>0</span>
                        )}
                      </td>
                      <td className={styles.rankingTd} style={{ textAlign: 'right' }}>
                        {formatMoney(item.avgTicket)}
                      </td>
                      <td className={styles.rankingTd} style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-gold)', fontSize: '1.05rem' }}>
                        {formatMoney(item.revenue)}
                      </td>
                      <td className={styles.rankingTd} style={{ textAlign: 'center' }}>
                        {growthBadge}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Client Leaderboard / Ranking Section */}
      <div className="glass-card-gold" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 className={styles.sectionTitle} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '5px' }}>
              Ranking de Clientas (Fidelización)
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Estas son las clientas que más han consumido en el estudio. Ideal para realizar sorteos de fin de año o regalar beneficios especiales.
            </p>
          </div>
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

