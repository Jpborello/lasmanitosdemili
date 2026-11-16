/**
 * Normaliza un teléfono para usarlo como identidad única de clienta en toda la app.
 *
 * Se queda solo con los dígitos y descarta el/los cero(s) inicial(es) que se usan en
 * Argentina para marcar en formato local (ej. "0341 798-1212"). Sin esto, la misma
 * persona podía terminar generando dos clientas distintas ("03417981212" y
 * "3417981212") según cómo haya tipeado el número esa vez, y eso rompía el sistema
 * de restricciones: una clienta marcada como restringida con un formato podía seguir
 * reservando sin problema con el otro.
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  if (typeof phone === 'string' && phone.startsWith('sintel_')) {
    return phone;
  }
  return phone.replace(/\D/g, '').replace(/^0+/, '');
}

/**
 * Pasa un número que viene de WhatsApp (formato internacional, ej. "5493417981212")
 * al formato con que se guardan las clientas en la base ("3417981212"), para que el
 * bot encuentre a la misma clienta que reservó desde la web.
 */
export function fromWhatsAppNumber(waNumber) {
  const digits = String(waNumber || '').replace(/\D/g, '');
  if (digits.startsWith('549') && digits.length === 13) return digits.slice(3);
  if (digits.startsWith('54') && digits.length === 12) return digits.slice(2);
  return digits;
}

export function isNoPhone(phone) {
  return typeof phone === 'string' && phone.startsWith('sintel_');
}

export function formatClientPhone(phone) {
  if (!phone || isNoPhone(phone)) return 'Sin celular';
  return phone;
}
