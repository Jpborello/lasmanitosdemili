// Editables a mano: ajustá estos valores según corresponda.
export const YEARS_OF_EXPERIENCE = 6;
export const MILI_WHATSAPP_NUMBER = '5493413022674'; // Formato internacional (54 9 341 302 2674)

// Franja de confianza de la landing: representa la trayectoria de Mili ANTES
// de este sistema de reservas online (años trabajando de manera particular/presencial).
// Mili trabaja sola, así que un turno siempre es una clienta atendida: "Turnos
// Realizados" y "Clientas Atendidas" usan la misma base y crecen siempre juntos.
// Cálculo: 4 clientas/día × 6 días/semana × 52 semanas/año × 6 años = 7488.
// A esta base se le suma en vivo lo que se va reservando desde la web (ver Landing.js),
// así el número crece solo con el tiempo en vez de quedar fijo para siempre.
export const TURNOS_ATENDIDOS_BASE_OFFSET = 7488;

export const DEFAULT_SERVICES = [
  { id: 'semi_mani', category: 'manicura', name: 'Semipermanente', price: 14000, duration: '60 min' },
  { id: 'kapping', category: 'manicura', name: 'Kapping Poligel', price: 18000, duration: '90 min' },
  { id: 'soft_gel', category: 'manicura', name: 'Soft Gel', price: 19000, duration: '90 min' },
  { id: 'esculpidas', category: 'manicura', name: 'Esculpidas', price: 20000, duration: '120 min' },
  { id: 'retirado_mani', category: 'manicura', name: 'Retirado final', price: 5000, duration: '30 min' },
  { id: 'semi_pedi', category: 'pedicura', name: 'Semipermanente', price: 12000, duration: '60 min' },
  { id: 'pedi_completa', category: 'pedicura', name: 'Retirado de callos, grietas y piel muerta + hidratación', price: 15000, duration: '75 min' },
  { id: 'pedi_completa_semi', category: 'pedicura', name: 'Retirado de callos, grietas y piel muerta + hidratación + semi', price: 20000, duration: '100 min' }
];
