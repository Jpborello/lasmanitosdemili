'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Sparkles } from 'lucide-react';
import styles from '@/styles/admin.module.css';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Verificar si ya está autenticado
  useEffect(() => {
    fetch('/api/admin/login')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          router.push('/admin');
        } else {
          setCheckingAuth(false);
        }
      })
      .catch(() => {
        setCheckingAuth(false);
      });
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Contraseña incorrecta');
      }

      router.push('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className={styles.loginContainer}>
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className={styles.loginContainer}>
      <div className={`${styles.loginCard} glass-card-gold animate-scale-in`}>
        <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--accent-rose)', marginBottom: '-10px' }}>
          <Sparkles size={40} />
        </div>
        <h1 className={styles.loginTitle}>Mili Nails</h1>
        <p className={styles.loginSubtitle}>Panel de Administración</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="formGroup" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="label" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>
              Contraseña de Acceso
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="input"
                style={{ width: '100%', paddingLeft: '40px' }}
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
            </div>
          </div>

          {error && <p style={{ color: 'var(--error)', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <a href="/" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', hover: { textDecoration: 'underline' } }}>
          ← Volver a la web
        </a>
      </div>
    </div>
  );
}
