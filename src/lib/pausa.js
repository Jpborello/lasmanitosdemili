// Pausa general de la web.
// En true: la web pública y el panel de admin muestran una pantalla negra de
// "no disponible" con el WhatsApp para turnos, y todas las APIs responden 503
// (incluido el cron de recordatorios). No se borra ningún dato.
// Para volver a habilitar todo: poner false, commitear y pushear.
export const SITE_PAUSED = false;
