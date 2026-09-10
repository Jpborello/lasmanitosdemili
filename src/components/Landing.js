'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Clock, MapPin, ShieldCheck, Heart, ChevronDown, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import styles from '@/styles/landing.module.css';
import BookingCalendar from './BookingCalendar';
import Reveal from './Reveal';
import { DEFAULT_SERVICES, YEARS_OF_EXPERIENCE, MILI_WHATSAPP_NUMBER, TURNOS_ATENDIDOS_BASE_OFFSET } from '@/lib/constants';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useCountUp } from '@/hooks/useCountUp';
const GALLERY_IMAGES = [
  { src: '/images/Screenshot 2026-07-21 193733.png', title: 'Diseño Soft Pink' },
  { src: '/images/Screenshot 2026-07-21 193745.png', title: 'Francesitas Delicadas' },
  { src: '/images/Screenshot 2026-07-21 193758.png', title: 'Kapping con Brillo' },
  { src: '/images/Screenshot 2026-07-21 193807.png', title: 'Glitter Ombré' },
  { src: '/images/Screenshot 2026-07-21 193816.png', title: 'Nude Coffin' },
  { src: '/images/Screenshot 2026-07-21 193828.png', title: 'Efecto Mármol' },
  { src: '/images/Screenshot 2026-07-21 193838.png', title: 'Decoración Mano Alzada' },
];

// Preguntas frecuentes para SEO y orientación de clientas en Rosario
const FAQ_ITEMS = [
  {
    q: '¿Dónde queda el estudio de manicuría en Rosario?',
    a: 'El estudio de Las Manitos de Mili se encuentra en Rosario, Santa Fe. Atendemos con turno previo reservado desde la web o coordinado por WhatsApp para asegurarte exclusividad, puntualidad y un ambiente relajante sin esperas.',
  },
  {
    q: '¿Qué diferencia hay entre Kapping Poligel, Soft Gel y Uñas Esculpidas?',
    a: 'El Kapping Poligel refuerza tu uña natural para evitar quiebres y permitir que crezca sana sin alargarla. El Soft Gel añade extensión mediante tips de gel preformados ligeros y rápidos de colocar. Las Uñas Esculpidas se construyen artesanalmente sobre molde para lograr el largo y la forma personalizada que desees.',
  },
  {
    q: '¿Cuánto tiempo dura el esmaltado semipermanente?',
    a: 'El esmaltado semipermanente dura entre 15 y 21 días impecable con brillo intacto, dependiendo del crecimiento natural de tu uña y los cuidados cotidianos.',
  },
  {
    q: '¿Cómo reservo mi turno de manicura en Rosario?',
    a: 'Es muy fácil: elegís la fecha y horario disponible en nuestro calendario de reservas online, completás tus datos y confirmás en el acto. Si tenés dudas, también podés escribirnos directo por WhatsApp.',
  },
  {
    q: '¿Realizan servicios de pedicuría y spa de pies en Rosario?',
    a: '¡Sí! Contamos con esmaltado semipermanente en pies y tratamiento de pedicuría completa que incluye remoción profunda de asperezas, durezas y callosidades, exfoliación e hidratación intensiva.',
  },
];

export default function Landing() {
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewName, setReviewName] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [servicesList, setServicesList] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const selectedImage = selectedImageIndex !== null ? GALLERY_IMAGES[selectedImageIndex] : null;

  // FAQ acordeón
  const [openFaq, setOpenFaq] = useState(0);

  // Estado de Administradora para mostrar botón en navbar si está autenticada
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    fetch('/api/admin/login')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setIsAdmin(true);
        }
      })
      .catch(err => console.error('Error checking admin status:', err));
  }, []);

  // Mercado Pago feedback parameters checking
  const [paymentStatus, setPaymentStatus] = useState(null);

  // Header: se vuelve "glass" y se achica al hacer scroll
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setIsHeaderScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hero: parallax sutil en la imagen al hacer scroll
  const heroImageRef = useRef(null);
  useEffect(() => {
    let rafId = null;
    const handleParallax = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        if (heroImageRef.current) {
          const offset = Math.min(window.scrollY * 0.15, 60);
          heroImageRef.current.style.transform = `translateY(calc(-8% + ${offset}px))`;
        }
        rafId = null;
      });
    };
    handleParallax();
    window.addEventListener('scroll', handleParallax, { passive: true });
    return () => window.removeEventListener('scroll', handleParallax);
  }, []);

  // Franja de confianza: la calificación se trae real de la base. Mili trabaja sola,
  // así que un turno siempre es una clienta atendida: "Turnos Realizados" y "Clientas
  // Atendidas" son el mismo número (base fija + turnos reservados en vivo desde la web).
  const [stats, setStats] = useState(null);
  const [statsRef, statsVisible] = useScrollReveal({ threshold: 0.1, rootMargin: '0px' });
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Error fetching stats:', err));
  }, []);
  // Red de seguridad: si por lo que sea el IntersectionObserver no dispara
  // (pantallas muy anchas, secciones cortas, navegadores raros, etc.), los
  // contadores igual arrancan solos a los 2 segundos de cargar la página.
  const [statsFallbackVisible, setStatsFallbackVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setStatsFallbackVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);
  const statsAnimationActive = statsVisible || statsFallbackVisible;
  const turnosAtendidosTotal = TURNOS_ATENDIDOS_BASE_OFFSET + (stats?.totalAppointments || 0);
  const clientsCount = useCountUp(turnosAtendidosTotal, { start: statsAnimationActive, duration: 1600 });
  const appointmentsCount = useCountUp(turnosAtendidosTotal, { start: statsAnimationActive, duration: 1800 });
  const yearsCount = useCountUp(YEARS_OF_EXPERIENCE, { start: statsAnimationActive, duration: 900 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const payment = params.get('payment');
      if (payment) {
        setTimeout(() => {
          setPaymentStatus(payment);
        }, 0);
        
        // Clean URL query parameters
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, []);



  useEffect(() => {
    fetch('/api/reviews')
      .then(res => res.json())
      .then(data => {
        if (data.reviews) {
          setReviews(data.reviews);
        }
      })
      .catch(err => console.error('Error fetching reviews:', err))
      .finally(() => setLoadingReviews(false));

    fetch('/api/admin/services')
      .then(res => res.json())
      .then(data => {
        if (data.services) {
          setServicesList(data.services);
        }
      })
      .catch(err => console.error('Error fetching services:', err));
  }, []);

  // Navegación del lightbox de la galería
  const goToPrevImage = () => {
    setSelectedImageIndex(prev => (prev === null ? null : (prev - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length));
  };
  const goToNextImage = () => {
    setSelectedImageIndex(prev => (prev === null ? null : (prev + 1) % GALLERY_IMAGES.length));
  };

  // Navegación del lightbox con teclado (flechas y Escape)
  useEffect(() => {
    if (selectedImageIndex === null) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') goToPrevImage();
      else if (e.key === 'ArrowRight') goToNextImage();
      else if (e.key === 'Escape') setSelectedImageIndex(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewName || !reviewComment || !reviewRating) {
      setReviewError('Por favor completa todos los campos.');
      return;
    }
    
    setReviewSubmitting(true);
    setReviewError('');
    
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: reviewName,
          comment: reviewComment,
          rating: reviewRating
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar opinión');
      }
      
      setReviewSuccess(data.message);
      setReviewName('');
      setReviewComment('');
      setReviewRating(5);
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">

      {paymentStatus && (
        <div className={styles.lightboxOverlay} style={{ zIndex: 9999 }}>
          <div className="glass-card-gold animate-scale-in" style={{ maxWidth: '450px', width: '90%', padding: '30px', textAlign: 'center', backgroundColor: 'var(--white)', position: 'relative' }}>
            <button 
              type="button" 
              className={styles.lightboxClose} 
              onClick={() => setPaymentStatus(null)}
              style={{ fontSize: '1.5rem', top: '10px', right: '15px' }}
            >
              ×
            </button>
            
            {paymentStatus === 'success' && (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🎉</div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '10px', color: 'var(--text-dark)', fontFamily: 'var(--font-serif)' }}>¡Reserva Confirmada!</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
                  El pago de tu seña se acreditó correctamente. Tu turno ha sido agendado y confirmado de manera exitosa. ¡Te esperamos para hacer brillar tus manos!
                </p>
              </>
            )}
            
            {paymentStatus === 'pending' && (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>⏳</div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '10px', color: 'var(--text-dark)', fontFamily: 'var(--font-serif)' }}>Pago Pendiente</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
                  Mercado Pago está procesando tu pago. Tu turno quedará confirmado automáticamente en cuanto se apruebe la transacción.
                </p>
              </>
            )}
            
            {paymentStatus === 'failure' && (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>❌</div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '10px', color: 'var(--error)', fontFamily: 'var(--font-serif)' }}>Pago Cancelado</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
                  No se pudo completar el pago de la seña. El turno no fue agendado. Por favor, intenta realizar la reserva de nuevo.
                </p>
              </>
            )}
            
            {paymentStatus === 'error' && (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>⚠️</div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '10px', color: 'var(--error)', fontFamily: 'var(--font-serif)' }}>Error en el Pago</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
                  Hubo un inconveniente al procesar tu pago de seña. Si el dinero fue debitado de tu cuenta, por favor comunícate con Mili para confirmarlo.
                </p>
              </>
            )}

            <button 
              type="button" 
              className="btn-primary" 
              onClick={() => setPaymentStatus(null)}
              style={{ padding: '10px 30px', fontSize: '0.85rem' }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`${styles.header} ${isHeaderScrolled ? styles.headerScrolled : ''}`}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div className={styles.logoContainer}>
            <img src="/logo.jpg" alt="Las Manitos de Mili - Manicuría Rosario" className={styles.logoImg} />
          </div>
          <nav className={styles.nav}>
            <a href="#inicio" className={styles.navLink}>Inicio</a>
            <a href="#sobre-mi" className={styles.navLink}>Sobre Mí</a>
            <a href="#servicios" className={styles.navLink}>Servicios</a>
            <a href="#galeria" className={styles.navLink}>Trabajos</a>
            <a href="#faq" className={styles.navLink}>Preguntas</a>
            <a href="#ubicacion" className={styles.navLink}>Estudio</a>
            <a href="#turnos" className={styles.navLink}>Reservar</a>
            <a href="/mis-turnos" className={styles.navLink}>Mis Turnos</a>
            {isAdmin && (
              <a href="/admin" className={styles.navAdminLink}>Admin</a>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section: a pantalla completa con la foto de Mili */}
      <section id="inicio" className={styles.heroSection}>
        <img
          ref={heroImageRef}
          src="/images/sami-hero.jpg"
          alt="Manicura profesional en Rosario mostrando diseño de uñas"
          className={styles.heroBgImage}
        />
        <div className={styles.heroDecorBlob1} aria-hidden="true"></div>
        <div className={styles.heroScrim} aria-hidden="true"></div>

        <div className={styles.heroContent}>
          <span className={`${styles.heroSubtitle} ${styles.heroFadeUp}`}>Manicuría Profesional en Rosario</span>
          <h1 className={`${styles.heroTitle} ${styles.heroFadeUp} ${styles.heroFadeUpDelay1}`}>
            Uñas & Manicuría en Rosario • Resalta la <span className={styles.heroTitleAccent}>belleza</span> de tus manos
          </h1>
          <p className={`${styles.heroDescription} ${styles.heroFadeUp} ${styles.heroFadeUpDelay2}`}>
            Estudio de manicuría y estética de uñas en Rosario. Kapping Poligel, Soft Gel, Uñas Esculpidas, Semipermanente y Pedicuría con productos importados y atención personalizada. ¡Reserva tu turno en minutos!
          </p>
          <div className={`${styles.heroButtons} ${styles.heroFadeUp} ${styles.heroFadeUpDelay3}`}>
            <a href="#turnos" className={styles.heroBtnPink}>
              Reservar Turno
            </a>
            <a href="#servicios" className="btn-secondary">
              Ver Servicios
            </a>
          </div>
        </div>

        <a href="#sobre-mi" className={styles.scrollDownIndicator} aria-label="Bajar para ver más">
          <ChevronDown size={22} />
        </a>
      </section>

      {/* Franja de confianza */}
      <section className={styles.trustStrip} ref={statsRef}>
        <div className="container">
          <div className={styles.trustGrid}>
            <div className={styles.trustItem}>
              <span className={styles.trustNumber}>{yearsCount}+</span>
              <span className={styles.trustLabel}>Años de Experiencia</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustNumber}>{clientsCount}+</span>
              <span className={styles.trustLabel}>Clientas Atendidas</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustNumber}>{appointmentsCount}+</span>
              <span className={styles.trustLabel}>Turnos Realizados</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustNumber}>{stats?.avgRating ? `${stats.avgRating}★` : '—'}</span>
              <span className={styles.trustLabel}>Calificación Promedio</span>
            </div>
          </div>
        </div>
      </section>

      {/* Sobre Mí Section */}
      <section id="sobre-mi" className={styles.aboutSection}>
        <div className="container">
          <div className={styles.aboutGrid}>
            <Reveal as="div" className={styles.aboutImageContainer}>
              <img
                src="/images/Screenshot 2026-07-21 193745.png"
                alt="Diseño de uñas real - Las Manitos de Mili"
                className={styles.aboutImage}
              />
            </Reveal>
            <Reveal as="div" delay={150} className={styles.aboutContent}>
              <span className={styles.sectionSubtitle}>Conóceme</span>
              <h2 className={styles.sectionTitle}>Mili • Especialista en Uñas</h2>
              <p className={styles.aboutText}>
                ¡Hola! Soy Mili. Desde hace años me dedico con alma y vida a mi gran pasión: ser manicura profesional.
              </p>
              <p className={styles.aboutText}>
                Para mí, cada mano es única. La considero un lienzo en blanco donde puedo proyectar mis inspiraciones y creatividad, combinando técnicas precisas con productos de la más alta calidad.
              </p>
              <p className={styles.aboutText}>
                Siempre busco la perfección absoluta en cada detalle, cuidando la salud de tus uñas y asegurándome de que salgas sintiéndote reluciente y feliz. ¡Te espero en el estudio para diseñar tus uñas ideales!
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicios" className={styles.servicesSection}>
        <div className="container">
          <Reveal as="div" className={styles.sectionHeader}>
            <span className={styles.sectionSubtitle}>Estudio de uñas en Rosario</span>
            <h2 className={styles.sectionTitle}>Nuestros Servicios Premium en Rosario</h2>
            <p style={{ color: 'var(--text-muted)' }}>Utilizamos productos de primera línea para garantizar la máxima durabilidad y salud de tus uñas y pies en Rosario, Santa Fe.</p>
          </Reveal>

          {/* Categoría: Manicuría */}
          <h3 className={styles.categoryTitle}>Servicios de Manicuría</h3>
          <div className={styles.servicesGrid} style={{ marginBottom: '50px' }}>
            {servicesList.length > 0 ? (
              servicesList.filter(s => s.category === 'manicura').map((s, idx) => (
                <Reveal as="div" key={s.id} delay={Math.min(idx, 6) * 90} className={`${styles.serviceCard} glass-card`}>
                  <div className={styles.serviceHeader}>
                    <h3 className={styles.serviceName}>{s.name}</h3>
                    <span className={styles.servicePrice}>${new Intl.NumberFormat('es-AR').format(s.price)}</span>
                  </div>
                  <p className={styles.serviceDesc}>
                    {s.id === 'semi_mani' && 'Esmaltado de larga duración con curado en cabina. Brillo extremo por 15 a 21 días.'}
                    {s.id === 'kapping' && 'Una fina capa de gel sobre tu uña natural para fortalecerla, evitar escamados y permitir que crezca sana.'}
                    {s.id === 'soft_gel' && 'Técnica express de extensión de uñas usando tips de gel que se adhieren perfectamente.'}
                    {s.id === 'esculpidas' && 'Extensión de uñas esculpidas a medida con gel constructor o acrílico.'}
                    {s.id === 'retirado_mani' && 'Retirado seguro y delicado del material anterior sin dañar tu uña natural.'}
                  </p>
                  <div className={styles.serviceMeta}>
                    <span className={styles.serviceMetaItem}>
                      <Clock size={14} /> {s.duration}
                    </span>
                    <span className={styles.serviceMetaItem}>
                      <ShieldCheck size={14} /> Productos Importados
                    </span>
                  </div>
                </Reveal>
              ))
            ) : (
              <div style={{ textAlign: 'center', gridColumn: '1/-1' }}>Cargando servicios...</div>
            )}
          </div>

          {/* Categoría: Pedicuría */}
          <h3 className={styles.categoryTitle}>Servicios de Pedicuría</h3>
          <div className={styles.servicesGrid}>
            {servicesList.length > 0 ? (
              servicesList.filter(s => s.category === 'pedicura').map((s, idx) => (
                <Reveal as="div" key={s.id} delay={Math.min(idx, 6) * 90} className={`${styles.serviceCard} glass-card`}>
                  <div className={styles.serviceHeader}>
                    <h3 className={styles.serviceName}>{s.name}</h3>
                    <span className={styles.servicePrice}>${new Intl.NumberFormat('es-AR').format(s.price)}</span>
                  </div>
                  <p className={styles.serviceDesc}>
                    {s.id === 'semi_pedi' && 'Esmaltado semipermanente en pies con curado en cabina para lucir tus uñas perfectas y duraderas.'}
                    {s.id === 'pedi_completa' && 'Tratamiento profundo para remoción de asperezas, callosidades y exfoliación, finalizando con crema hidratante.'}
                    {s.id === 'pedi_completa_semi' && 'Tratamiento de pedicura completa con remoción de asperezas sumando esmaltado semipermanente.'}
                  </p>
                  <div className={styles.serviceMeta}>
                    <span className={styles.serviceMetaItem}>
                      <Clock size={14} /> {s.duration}
                    </span>
                    <span className={styles.serviceMetaItem}>
                      <ShieldCheck size={14} /> Cuidado Profundo
                    </span>
                  </div>
                </Reveal>
              ))
            ) : (
              <div style={{ textAlign: 'center', gridColumn: '1/-1' }}>Cargando servicios...</div>
            )}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="galeria" className={styles.gallerySection}>
        <div className="container">
          <Reveal as="div" className={styles.sectionHeader}>
            <span className={styles.sectionSubtitle}>Galería de trabajos</span>
            <h2 className={styles.sectionTitle}>Mis Diseños</h2>
            <p style={{ color: 'var(--text-muted)' }}>Echa un vistazo a algunos de los últimos diseños realizados en el estudio.</p>
          </Reveal>

          <div className={styles.galleryGrid}>
            {GALLERY_IMAGES.map((img, idx) => (
              <Reveal
                as="div"
                key={idx}
                delay={Math.min(idx, 6) * 80}
                className={`${styles.galleryItem} ${styles[`galleryItem${(idx % 3) + 1}`]}`}
                onClick={() => setSelectedImageIndex(idx)}
                title="Haz clic para ampliar"
              >
                <img src={img.src} alt={img.title} className={styles.galleryImg} />
                <div className={styles.watermark}>Las Manitos de Mili</div>
                <div className={styles.galleryOverlay}>
                  <span className={styles.galleryTitle}>{img.title}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox / Modal de Imagen Ampliada */}
      {selectedImage && (
        <div
          className={styles.lightboxOverlay}
          onClick={() => setSelectedImageIndex(null)}
        >
          <button
            type="button"
            className={`${styles.lightboxNavBtn} ${styles.lightboxNavPrev}`}
            onClick={(e) => { e.stopPropagation(); goToPrevImage(); }}
            aria-label="Foto anterior"
          >
            <ChevronLeft size={28} />
          </button>

          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.lightboxClose}
              onClick={() => setSelectedImageIndex(null)}
            >
              ×
            </button>
            <img src={selectedImage.src} alt={selectedImage.title} className={styles.lightboxImg} />
            <div className={styles.lightboxCaption}>
              <h3>{selectedImage.title}</h3>
              <p>Las Manitos de Mili - Trabajo Real · {selectedImageIndex + 1} / {GALLERY_IMAGES.length}</p>
            </div>
          </div>

          <button
            type="button"
            className={`${styles.lightboxNavBtn} ${styles.lightboxNavNext}`}
            onClick={(e) => { e.stopPropagation(); goToNextImage(); }}
            aria-label="Foto siguiente"
          >
            <ChevronRight size={28} />
          </button>
        </div>
      )}

      {/* Testimonials */}
      <section className={styles.testimonialsSection}>
        <div className="container">
          <Reveal as="div" className={styles.sectionHeader}>
            <span className={styles.sectionSubtitle}>Opiniones</span>
            <h2 className={styles.sectionTitle}>Lo que dicen nuestras clientas</h2>
          </Reveal>

          <div className={styles.testimonialsGrid}>
            {loadingReviews ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px 0' }}>
                <div className={styles.loader} style={{ margin: '0 auto' }}></div>
              </div>
            ) : reviews.length === 0 ? (
              <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Aún no hay opiniones aprobadas. ¡Sé la primera en dejar tu reseña!
              </p>
            ) : (
              reviews.map((rev, idx) => (
                <Reveal as="div" key={rev.id} delay={Math.min(idx, 6) * 90} className={`${styles.testimonialCard} glass-card`}>
                  <span className={styles.quoteIcon}>"</span>
                  <p className={styles.testimonialText}>{rev.comment}</p>
                  <div className={styles.testimonialAuthor}>— {rev.client_name}</div>
                  <div className={styles.stars}>
                    {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                  </div>
                </Reveal>
              ))
            )}
          </div>

          {/* Formulario de Reseñas */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px' }}>
            {!showReviewForm ? (
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setShowReviewForm(true)}
              >
                Escribir una opinión
              </button>
            ) : (
              <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '30px', textAlign: 'left', animation: 'scaleIn 0.4s ease forwards' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', fontFamily: 'var(--font-serif)' }}>Déjanos tu opinión</h3>
                
                {reviewSuccess ? (
                  <div style={{ textAlign: 'center', color: 'var(--success)' }}>
                    <p style={{ fontWeight: 600 }}>{reviewSuccess}</p>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      style={{ marginTop: '15px', padding: '8px 16px', fontSize: '0.85rem' }} 
                      onClick={() => {
                        setShowReviewForm(false);
                        setReviewSuccess('');
                      }}
                    >
                      Cerrar
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Nombre *</label>
                      <input 
                        type="text" 
                        required 
                        className="input" 
                        placeholder="Tu nombre" 
                        value={reviewName}
                        onChange={(e) => setReviewName(e.target.value)}
                        style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Calificación *</label>
                      <div style={{ display: 'flex', gap: '8px', color: 'var(--accent-gold)', fontSize: '1.5rem', cursor: 'pointer' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span 
                            key={star} 
                            onClick={() => setReviewRating(star)}
                          >
                            {star <= reviewRating ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Comentario *</label>
                      <textarea 
                        required 
                        rows="3" 
                        className="input" 
                        placeholder="Cuéntanos tu experiencia con Mili..." 
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        style={{ resize: 'vertical', fontFamily: 'inherit', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}
                      />
                    </div>

                    {reviewError && <p style={{ color: 'var(--error)', fontSize: '0.85rem' }}>{reviewError}</p>}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button 
                        type="submit" 
                        className="btn-primary" 
                        disabled={reviewSubmitting}
                        style={{ padding: '10px 20px', fontSize: '0.8rem' }}
                      >
                        {reviewSubmitting ? 'Enviando...' : 'Enviar Opinión'}
                      </button>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        onClick={() => setShowReviewForm(false)}
                        style={{ padding: '10px 20px', fontSize: '0.8rem' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sección de Preguntas Frecuentes (FAQ - SEO y Experiencia de Usuario) */}
      <section id="faq" className={styles.faqSection}>
        <div className="container">
          <Reveal as="div" className={styles.sectionHeader}>
            <span className={styles.sectionSubtitle}>Dudas habituales</span>
            <h2 className={styles.sectionTitle}>Preguntas Frecuentes sobre Manicuría en Rosario</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Todo lo que necesitas saber antes de tu cita en Las Manitos de Mili.
            </p>
          </Reveal>

          <div className={styles.faqGrid}>
            {FAQ_ITEMS.map((item, idx) => (
              <Reveal as="div" key={idx} delay={Math.min(idx, 4) * 80} className={`${styles.faqCard} ${openFaq === idx ? styles.faqCardActive : ''} glass-card`}>
                <button
                  type="button"
                  className={styles.faqQuestionBtn}
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  aria-expanded={openFaq === idx}
                >
                  <span className={styles.faqQuestionText}>{item.q}</span>
                  <ChevronDown
                    size={20}
                    className={`${styles.faqChevron} ${openFaq === idx ? styles.faqChevronOpen : ''}`}
                  />
                </button>
                {openFaq === idx && (
                  <div className={`${styles.faqAnswer} animate-fade-in`}>
                    <p>{item.a}</p>
                  </div>
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Sección de Ubicación & Estudio en Rosario */}
      <section id="ubicacion" className={styles.locationSection}>
        <div className="container">
          <Reveal as="div" className={`${styles.locationCard} glass-card-gold`}>
            <div className={styles.locationInfo}>
              <span className={styles.sectionSubtitle}>Visítanos</span>
              <h2 className={styles.sectionTitle} style={{ textAlign: 'left', marginBottom: '15px' }}>
                Estudio Las Manitos de Mili en Rosario
              </h2>
              <p className={styles.locationDesc}>
                Un espacio cálido y climatizado pensado para tu confort y desconexión en <strong>Rosario, Santa Fe</strong>. Trabajamos exclusivamente con turnos reservados para darte atención personalizada y cumplir con los más altos estándares de higiene y esterilización.
              </p>

              <div className={styles.locationFeatures}>
                <div className={styles.locationFeatureItem}>
                  <MapPin size={20} className={styles.locationIcon} />
                  <div>
                    <strong>Ciudad y Cobertura</strong>
                    <p>Rosario, Santa Fe, Argentina</p>
                  </div>
                </div>

                <div className={styles.locationFeatureItem}>
                  <Clock size={20} className={styles.locationIcon} />
                  <div>
                    <strong>Horarios de Atención</strong>
                    <p>Lunes a Sábados de 09:00 a 20:00 hs (con turno previo)</p>
                  </div>
                </div>

                <div className={styles.locationFeatureItem}>
                  <Sparkles size={20} className={styles.locationIcon} />
                  <div>
                    <strong>Atención Personalizada 1 a 1</strong>
                    <p>Puntualidad garantizada, sin demoras ni esperas en el salón</p>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '25px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <a href="#turnos" className="btn-primary">
                  Reservar Turno Ahora
                </a>
                <a
                  href={`https://wa.me/${MILI_WHATSAPP_NUMBER}?text=${encodeURIComponent('¡Hola Mili! Quería consultar por un turno de manicuría en Rosario 💅')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <MessageCircle size={16} /> Consultar por WhatsApp
                </a>
              </div>
            </div>

            <div className={styles.locationBadgeCard}>
              <div className={styles.locationBadgeCity}>Rosario</div>
              <div className={styles.locationBadgeState}>Santa Fe · Argentina</div>
              <div className={styles.locationBadgeDivider}></div>
              <p className={styles.locationBadgeText}>
                Especialista en Uñas Esculpidas, Kapping Poligel, Soft Gel, Semipermanente y Pedicuría.
              </p>
              <div className={styles.locationBadgeRating}>
                ★★★★★ <span>{stats?.avgRating ? `${stats.avgRating} / 5` : '5.0 / 5'}</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Booking Form Section */}
      <section id="turnos" className={styles.bookingSection}>
        <div className="container">
          <Reveal as="div" className={styles.sectionHeader}>
            <span className={styles.sectionSubtitle}>Reservas online</span>
            <h2 className={styles.sectionTitle}>Agenda tu cita en segundos</h2>
            <p style={{ color: 'var(--text-muted)' }}>Elige el día y horario que mejor te convenga. Recibirás la confirmación de inmediato.</p>
          </Reveal>

          <BookingCalendar />
        </div>
      </section>

      {/* Botón flotante de WhatsApp */}
      <a
        href={`https://wa.me/${MILI_WHATSAPP_NUMBER}?text=${encodeURIComponent('¡Hola! Quiero consultar por un turno 💅')}`}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.floatingWhatsApp}
        aria-label="Escribinos por WhatsApp"
      >
        <MessageCircle size={26} />
      </a>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center', marginBottom: '15px' }}>
            <MapPin size={16} /> <span>Rosario, Santa Fe, Argentina</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}>
            <a href="https://instagram.com/las_manitosde_mili" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}>
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
              @las_manitosde_mili
            </a>
          </div>
          <p>© {new Date().getFullYear()} <a href="/admin/login" style={{ color: 'inherit', textDecoration: 'none', cursor: 'default' }}>Las Manitos de Mili</a>. Creado con mucho <Heart size={12} style={{ display: 'inline', color: 'var(--accent-rose)', fill: 'var(--accent-rose)' }} /> para hacerte brillar.</p>
          <p style={{ marginTop: '8px', fontSize: '0.8rem', opacity: 0.8 }}>
            Proyecto creado por{' '}
            <a 
              href="https://www.neo-core-sys.com.ar/" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: 'var(--accent-gold)', fontWeight: 600, textDecoration: 'none' }}
            >
              neo core sys
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
