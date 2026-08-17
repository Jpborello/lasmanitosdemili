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
  return phone.replace(/\D/g, '').replace(/^0+/, '');
}
