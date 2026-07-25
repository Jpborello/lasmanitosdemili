'use client';

import { RefreshCw } from 'lucide-react';
import styles from '@/styles/admin.module.css';

export default function ServicesTab({
  servicesList,
  loadingServices,
  savingServices,
  fetchServices,
  handleSavePrices,
  handlePriceChange,
}) {
  return (
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
  );
}
