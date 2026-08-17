/**
 * Módulo para el envío automático de mensajes de WhatsApp
 * Soporta Green API, UltraMsg y Meta Cloud API.
 */

/**
 * Formatear número telefónico para formato internacional E.164 (ej: 5493413022674)
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  
  // Si empieza con 0 en Argentina, quitarlo
  if (clean.startsWith('0')) {
    clean = clean.substring(1);
  }
  
  // Si no tiene código de país Argentina (54), agregarlo
  if (!clean.startsWith('54')) {
    clean = `54${clean}`;
  }
  
  // Si en Argentina falta el 9 después de 54 (ej: 5411...), agregarlo (54911...)
  if (clean.startsWith('54') && !clean.startsWith('549')) {
    clean = `549${clean.substring(2)}`;
  }

  return clean;
}

/**
 * Enviar mensaje de WhatsApp usando el proveedor configurado en .env.local
 */
export async function sendWhatsAppMessage({ to, text }) {
  try {
    const formattedPhone = formatPhoneNumber(to);
    if (!formattedPhone) {
      return { success: false, error: 'Número de teléfono inválido' };
    }

    // 1. Opciones con Green API (QR directo desde celular de Mili)
    const greenInstance = process.env.GREEN_API_INSTANCE_ID;
    const greenToken = process.env.GREEN_API_TOKEN;
    const greenBaseUrl = process.env.GREEN_API_URL || 'https://api.green-api.com';

    if (greenInstance && greenToken) {
      const url = `${greenBaseUrl}/waInstance${greenInstance}/sendMessage/${greenToken}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `${formattedPhone}@c.us`,
          message: text,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('❌ Error Green API:', data);
        return { success: false, error: data.message || 'Error en Green API' };
      }
      console.log('✅ Mensaje WhatsApp enviado por Green API:', data);
      return { success: true, data };
    }

    // 2. Opciones con UltraMsg (QR directo desde celular de Mili)
    const ultramsgInstance = process.env.ULTRAMSG_INSTANCE_ID;
    const ultramsgToken = process.env.ULTRAMSG_TOKEN;

    if (ultramsgInstance && ultramsgToken) {
      const url = `https://api.ultramsg.com/${ultramsgInstance}/messages/chat`;
      const params = new URLSearchParams({
        token: ultramsgToken,
        to: formattedPhone,
        body: text,
      });
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('❌ Error UltraMsg:', data);
        return { success: false, error: data.error || 'Error en UltraMsg' };
      }
      console.log('✅ Mensaje WhatsApp enviado por UltraMsg:', data);
      return { success: true, data };
    }

    // 3. Fallback: Meta Cloud API (si se usan credenciales de Meta)
    const metaToken = process.env.META_WA_TOKEN;
    const metaPhoneId = process.env.META_WA_PHONE_NUMBER_ID;

    if (metaToken && metaPhoneId) {
      const url = `https://graph.facebook.com/v18.0/${metaPhoneId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: { preview_url: false, body: text },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('❌ Error Meta API:', data);
        return { success: false, error: data.error?.message || 'Error en Meta API' };
      }
      console.log('✅ Mensaje WhatsApp enviado por Meta API:', data);
      return { success: true, data };
    }

    console.warn('⚠️ No hay proveedor de WhatsApp configurado en .env.local');
    return { success: false, error: 'Proveedor no configurado' };
  } catch (error) {
    console.error('❌ Excepción al enviar WhatsApp:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 1. Notificar a Mili cuando una clienta agenda un turno
 */
export async function notifyAdminNewAppointment(appointment) {
  const miliPhone = process.env.MILI_PHONE_NUMBER || '5493413022674';

  const message = `💅 *¡NUEVO TURNO RESERVADO!*

👤 *Clienta:* ${appointment.client_name}
📱 *Teléfono:* ${appointment.client_phone}
📅 *Fecha:* ${appointment.appointment_date}
⏰ *Hora:* ${appointment.appointment_time} hs
✨ *Servicio:* ${appointment.service}
💰 *Precio:* $${appointment.price}`;

  return await sendWhatsAppMessage({ to: miliPhone, text: message });
}

/**
 * 2. Enviar agradecimiento y datos del turno a la clienta
 */
export async function sendClientConfirmation(appointment) {
  const message = `💖 *¡Hola ${appointment.client_name}!*

Muchísimas gracias por confiar en mí y reservar tu turno en *Las Manitos de Mili* 💅✨.

📌 *Detalles de tu reserva:*
🗓️ *Fecha:* ${appointment.appointment_date}
⏰ *Hora:* ${appointment.appointment_time} hs
✨ *Servicio:* ${appointment.service}

¡Te espero con los brazos abiertos! Si tenés alguna duda o necesitás reprogramar, podés responder a este mensaje. 😊`;

  return await sendWhatsAppMessage({ to: appointment.client_phone, text: message });
}

/**
 * 3. Enviar recordatorio 1 día antes a la clienta
 */
export async function sendClientReminder(appointment) {
  const message = `🌸 *¡Hola ${appointment.client_name}!*

Te recuerdo que mañana *${appointment.appointment_date}* a las *${appointment.appointment_time} hs* tenés tu turno reservado en *Las Manitos de Mili* 💅 para *${appointment.service}*.

Por favor, avísame con anticipación si tenés algún inconveniente. ¡Nos vemos mañana! 🥰`;

  return await sendWhatsAppMessage({ to: appointment.client_phone, text: message });
}

/**
 * 4. Avisar a Mili que una clienta restringida reservó y su seña está pendiente de aprobación
 */
export async function notifyAdminDepositPending(appointment, depositAmount) {
  const miliPhone = process.env.MILI_PHONE_NUMBER || '5493413022674';

  const message = `⚠️ *SEÑA PENDIENTE DE APROBACIÓN*

👤 *Clienta:* ${appointment.client_name} (restringida por incumplimientos previos)
📱 *Teléfono:* ${appointment.client_phone}
📅 *Fecha:* ${appointment.appointment_date}
⏰ *Hora:* ${appointment.appointment_time} hs
✨ *Servicio:* ${appointment.service}
💰 *Seña requerida:* $${depositAmount}

El turno queda en espera hasta que confirmes el pago de la seña desde el panel de Turnos.`;

  return await sendWhatsAppMessage({ to: miliPhone, text: message });
}

/**
 * 5. Avisar a la clienta restringida que su turno quedó a la espera del pago de la seña
 */
export async function sendClientDepositInstructions(appointment, depositAmount, instructions) {
  const instructionsBlock = instructions && instructions.trim()
    ? `\n\n📌 *Cómo pagar:*\n${instructions.trim()}`
    : '';

  const message = `💅 *¡Hola ${appointment.client_name}!*

Tu turno para el *${appointment.appointment_date}* a las *${appointment.appointment_time} hs* (${appointment.service}) quedó reservado, pero está sujeto al pago de una seña de *$${depositAmount}*.

Por motivos de tiempo y valorando mi trabajo y el tiempo de las demás clientas, para las reservas se debe realizar un depósito de $${depositAmount}, el cual será reintegrado al finalizar el trabajo. Si el turno no se cancela con 24 horas de anticipación, la seña no será devuelta y se procederá a la inmediata expulsión del salón. Espero sepas entender, ¡muchas gracias! 💖${instructionsBlock}

Ni bien reciba tu pago, te confirmo el turno por acá. 😊`;

  return await sendWhatsAppMessage({ to: appointment.client_phone, text: message });
}
