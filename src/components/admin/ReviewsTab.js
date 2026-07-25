'use client';

import { RefreshCw, MessageSquare, Star, Trash2 } from 'lucide-react';
import styles from '@/styles/admin.module.css';

export default function ReviewsTab({
  reviews,
  loadingReviews,
  fetchReviews,
  handleApproveReview,
  handleDeleteReview,
  actionLoading,
}) {
  return (
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
                  &ldquo;{rev.comment}&rdquo;
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
  );
}
