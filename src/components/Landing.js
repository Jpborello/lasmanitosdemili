'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Clock, MapPin, ShieldCheck, Heart } from 'lucide-react';
import styles from '@/styles/landing.module.css';
import BookingCalendar from './BookingCalendar';

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

  // Estados del Overlay de Registro/Bienvenida
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Comprobar si ya está registrado en localStorage y si es admin en el servidor
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('mili_client_name');
      const savedPhone = localStorage.getItem('mili_client_phone');
      if (savedName && savedPhone) {
        setIsFirstTime(false);
      }
    }

    fetch('/api/admin/login')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setIsAdmin(true);
        }
      })
      .catch(err => console.error('Error checking admin status:', err));
  }, []);

  // Escuchar cambio de teléfono para mostrar input de contraseña de admin
  useEffect(() => {
    const cleanPhone = regPhone.replace(/\D/g, '');
    if (cleanPhone === '3413022674') {
      setShowPassword(true);
    } else {
      setShowPassword(false);
    }
  }, [regPhone]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regName || !regPhone) {
      setRegError('Por favor completa los campos obligatorios.');
      return;
    }

    setRegSubmitting(true);
    setRegError('');

    try {
      const cleanPhone = regPhone.replace(/\D/g, '');
      let finalName = regName;
      let finalEmail = regEmail;
      
      // Si es Mili (administradora)
      if (cleanPhone === '3413022674') {
        if (!regPassword) {
          setRegError('Por favor ingresa la contraseña de administradora.');
          setRegSubmitting(false);
          return;
        }

        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: regPassword }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Contraseña incorrecta');
        }

        setIsAdmin(true);
      } else {
        // Consultar autocomplete por si ya tiene reservas previas
        try {
          const autoRes = await fetch(`/api/appointments/autocomplete?phone=${encodeURIComponent(regPhone)}`);
          const autoData = await autoRes.json();
          if (autoData.found) {
            // Si tiene datos anteriores, respetamos sus datos
            finalName = autoData.client_name;
            if (autoData.client_email) finalEmail = autoData.client_email;
          }
        } catch (err) {
          console.error('Error fetching autocomplete on welcome:', err);
        }
      }

      // Guardar datos en localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('mili_client_name', finalName);
        localStorage.setItem('mili_client_phone', regPhone);
        localStorage.setItem('mili_client_email', finalEmail || '');
      }

      setIsFirstTime(false);
      // Forzar recarga para que BookingCalendar tome la sesión
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (err) {
      setRegError(err.message);
    } finally {
      setRegSubmitting(false);
    }
  };

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

  if (isFirstTime) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)', padding: '20px' }} className="animate-fade-in">
        {/* Simple Header */}
        <header className={styles.header} style={{ borderBottom: 'none', marginBottom: '20px' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <div className={styles.logoContainer}>
              <img src="/logo.jpg" alt="Las Manitos de Mili" className={styles.logoImg} />
            </div>
          </div>
        </header>

        {/* Center welcome card */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px 0' }}>
          <div className={`${styles.welcomeCard} glass-card-gold animate-scale-in`} style={{ boxShadow: 'var(--shadow-soft)', position: 'relative' }}>
            <div className={styles.welcomeSubtitle}>Las Manitos de Mili</div>
            <h2 className={styles.welcomeTitle}>
              ¡Te damos la <span>Bienvenida</span>!
            </h2>
            <p className={styles.welcomeDesc}>
              Completa tus datos por única vez para participar en nuestros sorteos de fin de año y agendar tus turnos con un solo clic.
            </p>
            
            <form className={styles.welcomeForm} onSubmit={handleRegisterSubmit}>
              <div className={styles.formGroupRow}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>Nombre Completo *</label>
                <input
                  type="text"
                  placeholder="Ej. María Gómez"
                  required
                  className={styles.welcomeInput}
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  disabled={regSubmitting}
                />
              </div>

              <div className={styles.formGroupRow}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>Teléfono Celular *</label>
                <input
                  type="tel"
                  placeholder="Ej. 11 2345 6789"
                  required
                  className={styles.welcomeInput}
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  disabled={regSubmitting}
                />
              </div>

              <div className={styles.formGroupRow}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>Email (Opcional)</label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  className={styles.welcomeInput}
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  disabled={regSubmitting}
                />
              </div>

              {showPassword && (
                <div className={`${styles.formGroupRow} animate-fade-in`}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-gold)' }}>
                    Contraseña de Administradora *
                  </label>
                  <input
                    type="password"
                    placeholder="Contraseña de administrador"
                    required
                    className={styles.welcomeInput}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    disabled={regSubmitting}
                    style={{ borderColor: 'var(--accent-gold)' }}
                  />
                </div>
              )}

              {regError && (
                <p style={{ color: 'var(--error)', fontSize: '0.85rem', fontWeight: 600, margin: '5px 0' }}>
                  {regError}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={regSubmitting}
                style={{ width: '100%', marginTop: '10px', padding: '14px', borderRadius: '30px' }}
              >
                {regSubmitting ? 'Registrando...' : showPassword ? 'Iniciar Sesión Admin' : 'Registrarme e Ingresar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">

      {/* Header */}
      <header className={styles.header}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div className={styles.logoContainer}>
            <img src="/logo.jpg" alt="Las Manitos de Mili" className={styles.logoImg} />
          </div>
          <nav className={styles.nav}>
            <a href="#inicio" className={styles.navLink}>Inicio</a>
            <a href="#sobre-mi" className={styles.navLink}>Sobre Mí</a>
            <a href="#servicios" className={styles.navLink}>Servicios</a>
            <a href="#galeria" className={styles.navLink}>Trabajos</a>
            <a href="#turnos" className={styles.navLink}>Reservar</a>
            {isAdmin && (
              <a href="/admin" className={styles.navAdminLink}>Admin</a>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section id="inicio" className="container">
        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <span className={styles.heroSubtitle}>Manicura Profesional</span>
            <h1 className={styles.heroTitle}>Resalta la belleza de tus manos</h1>
            <p className={styles.heroDescription}>
              Servicio de manicuría de alta calidad, diseñado para cuidar y embellecer tus uñas con técnicas profesionales y productos premium. ¡Reserva tu turno en minutos!
            </p>
            <div className={styles.heroButtons}>
              <a href="#turnos" className="btn-primary">
                <Sparkles size={16} /> Reservar Turno
              </a>
              <a href="#servicios" className="btn-secondary">
                Ver Servicios
              </a>
            </div>
          </div>
          <div className={styles.heroImageContainer}>
            <img 
              src="/images/sami.jpg" 
              alt="Sami trabajando en Mili Nails" 
              className={styles.heroImage}
              style={{ objectPosition: 'center 20%' }}
            />
          </div>
        </div>
      </section>

      {/* Sobre Mí Section */}
      <section id="sobre-mi" className={styles.aboutSection}>
        <div className="container">
          <div className={styles.aboutGrid}>
            <div className={styles.aboutImageContainer}>
              <img 
                src="/images/Screenshot 2026-07-21 193745.png" 
                alt="Diseño de uñas real - Las Manitos de Mili" 
                className={styles.aboutImage}
              />
            </div>
            <div className={styles.aboutContent}>
              <span className={styles.sectionSubtitle}>Conóceme</span>
              <h2 className={styles.sectionTitle}>Sami • Especialista en Uñas</h2>
              <p className={styles.aboutText}>
                ¡Hola! Soy Sami. Desde hace años me dedico con alma y vida a mi gran pasión: ser manicura profesional.
              </p>
              <p className={styles.aboutText}>
                Para mí, cada mano es única. La considero un lienzo en blanco donde puedo proyectar mis inspiraciones y creatividad, combinando técnicas precisas con productos de la más alta calidad.
              </p>
              <p className={styles.aboutText}>
                Siempre busco la perfección absoluta en cada detalle, cuidando la salud de tus uñas y asegurándome de que salgas sintiéndote reluciente y feliz. ¡Te espero en el estudio para diseñar tus uñas ideales!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicios" className={styles.servicesSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionSubtitle}>¿Qué ofrecemos?</span>
            <h2 className={styles.sectionTitle}>Nuestros Servicios Premium</h2>
            <p style={{ color: 'var(--text-muted)' }}>Utilizamos productos de primera línea para garantizar la durabilidad y salud de tus uñas y pies.</p>
          </div>

          {/* Categoría: Manicuría */}
          <h3 className={styles.categoryTitle}>Servicios de Manicuría</h3>
          <div className={styles.servicesGrid} style={{ marginBottom: '50px' }}>
            {servicesList.length > 0 ? (
              servicesList.filter(s => s.category === 'manicura').map(s => (
                <div key={s.id} className={`${styles.serviceCard} glass-card`}>
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
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', gridColumn: '1/-1' }}>Cargando servicios...</div>
            )}
          </div>

          {/* Categoría: Pedicuría */}
          <h3 className={styles.categoryTitle}>Servicios de Pedicuría</h3>
          <div className={styles.servicesGrid}>
            {servicesList.length > 0 ? (
              servicesList.filter(s => s.category === 'pedicura').map(s => (
                <div key={s.id} className={`${styles.serviceCard} glass-card`}>
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
                </div>
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
          <div className={styles.sectionHeader}>
            <span className={styles.sectionSubtitle}>Galería de trabajos</span>
            <h2 className={styles.sectionTitle}>Mis Diseños</h2>
            <p style={{ color: 'var(--text-muted)' }}>Echa un vistazo a algunos de los últimos diseños realizados en el estudio.</p>
          </div>

          <div className={styles.galleryGrid}>
            {[
              { src: '/images/Screenshot 2026-07-21 193733.png', title: 'Diseño Soft Pink' },
              { src: '/images/Screenshot 2026-07-21 193745.png', title: 'Francesitas Delicadas' },
              { src: '/images/Screenshot 2026-07-21 193758.png', title: 'Kapping con Brillo' },
              { src: '/images/Screenshot 2026-07-21 193807.png', title: 'Glitter Ombré' },
              { src: '/images/Screenshot 2026-07-21 193816.png', title: 'Nude Coffin' },
              { src: '/images/Screenshot 2026-07-21 193828.png', title: 'Efecto Mármol' },
              { src: '/images/Screenshot 2026-07-21 193838.png', title: 'Decoración Mano Alzada' },
            ].map((img, idx) => (
              <div key={idx} className={styles.galleryItem}>
                <img src={img.src} alt={img.title} className={styles.galleryImg} />
                <div className={styles.watermark}>Mili Nails</div>
                <div className={styles.galleryOverlay}>
                  <span className={styles.galleryTitle}>{img.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className={styles.testimonialsSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionSubtitle}>Opiniones</span>
            <h2 className={styles.sectionTitle}>Lo que dicen nuestras clientas</h2>
          </div>

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
              reviews.map((rev) => (
                <div key={rev.id} className={`${styles.testimonialCard} glass-card`} style={{ animation: 'fadeIn 0.5s ease forwards' }}>
                  <span className={styles.quoteIcon}>“</span>
                  <p className={styles.testimonialText}>{rev.comment}</p>
                  <div className={styles.testimonialAuthor}>— {rev.client_name}</div>
                  <div className={styles.stars}>
                    {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                  </div>
                </div>
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

      {/* Booking Form Section */}
      <section id="turnos" className={styles.bookingSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionSubtitle}>Reservas online</span>
            <h2 className={styles.sectionTitle}>Agenda tu cita en segundos</h2>
            <p style={{ color: 'var(--text-muted)' }}>Elige el día y horario que mejor te convenga. Recibirás la confirmación de inmediato.</p>
          </div>

          <BookingCalendar />
        </div>
      </section>

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
          <p>© {new Date().getFullYear()} <a href="/admin/login" style={{ color: 'inherit', textDecoration: 'none', cursor: 'default' }}>Mili Nails</a>. Creado con mucho <Heart size={12} style={{ display: 'inline', color: 'var(--accent-rose)', fill: 'var(--accent-rose)' }} /> para hacerte brillar.</p>
        </div>
      </footer>
    </div>
  );
}
