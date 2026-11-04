'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, X, Share } from 'lucide-react';
import styles from '@/styles/pwa.module.css';

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            reg.addEventListener('updatefound', () => {
              const installingWorker = reg.installing;
              if (installingWorker) {
                installingWorker.addEventListener('statechange', () => {
                  if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('Nueva versión de Las Manitos de Mili lista.');
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.error('Error registrando Service Worker:', err);
          });
      });
    }

    // 2. Check standalone
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandaloneMode) {
      // Schedule standalone state update safely
      requestAnimationFrame(() => setIsStandalone(true));
      return;
    }

    // 3. Check dismissal memory (7 days snooze)
    const dismissedTime = localStorage.getItem('pwa_prompt_dismissed');
    const isDismissedRecent =
      dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 7 * 24 * 60 * 60 * 1000;

    // 4. iOS Detection
    const userAgent = window.navigator.userAgent || '';
    const isIosDevice = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;

    if (isIosDevice && !isDismissedRecent) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // 5. Android / Chrome / Edge beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissedRecent) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 6. Handle appinstalled event
    const handleAppInstalled = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
      console.log('App instalada con éxito');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const isIosDevice =
      typeof window !== 'undefined' &&
      /iPad|iPhone|iPod/.test(window.navigator.userAgent || '') &&
      !window.MSStream;

    if (isIosDevice) {
      setShowIosModal(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
    } catch {
      // ignore storage errors
    }
  };

  if (isStandalone || !showBanner) {
    return null;
  }

  return (
    <>
      <div className={styles.pwaBannerWrapper} role="dialog" aria-label="Instalar aplicación">
        <div className={styles.pwaCard}>
          <Image
            src="/icons/icon-192x192.png"
            alt="Las Manitos de Mili"
            width={48}
            height={48}
            className={styles.appIcon}
          />
          <div className={styles.infoCol}>
            <div className={styles.title}>Las Manitos de Mili</div>
            <div className={styles.subtitle}>Instalá la app para reservar más fácil</div>
          </div>
          <div className={styles.actionGroup}>
            <button
              onClick={handleInstallClick}
              className={styles.installBtn}
              aria-label="Instalar app"
            >
              <Download size={14} />
              <span>Instalar</span>
            </button>
            <button
              onClick={handleDismiss}
              className={styles.closeBtn}
              aria-label="Cerrar aviso"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {showIosModal && (
        <div
          className={styles.iosModalOverlay}
          onClick={() => setShowIosModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={styles.iosModalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.iosModalHeader}>
              <h3 className={styles.iosModalTitle}>Cómo instalar en tu iPhone</h3>
              <button
                onClick={() => setShowIosModal(false)}
                className={styles.closeBtn}
                aria-label="Cerrar instrucciones"
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.iosStep}>
              <span className={styles.stepNumber}>1</span>
              <div>
                Tocá el botón de <strong>Compartir</strong>{' '}
                <Share size={16} className={styles.iosIconInline} /> en la barra inferior de Safari.
              </div>
            </div>
            <div className={styles.iosStep}>
              <span className={styles.stepNumber}>2</span>
              <div>
                Deslizá hacia abajo y seleccioná <strong>&quot;Agregar a inicio&quot;</strong>.
              </div>
            </div>
            <div className={styles.iosStep}>
              <span className={styles.stepNumber}>3</span>
              <div>
                Tocá <strong>&quot;Agregar&quot;</strong> arriba a la derecha. ¡Y listo!
              </div>
            </div>
            <button
              onClick={() => setShowIosModal(false)}
              className={styles.iosGotItBtn}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
