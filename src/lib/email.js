/**
 * Módulo para el envío automático de emails.
 * Usa la API de Resend (https://resend.com). Si no está configurada, se omite
 * silenciosamente (igual que pasa con WhatsApp cuando falta el proveedor).
 */

const BRAND_COLOR = '#c57895';

function wrapEmailHtml(title, bodyHtml) {
  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #2c2220;">
      <h2 style="color: ${BRAND_COLOR}; margin-bottom: 4px;">💅 Las Manitos de Mili</h2>
      <h3 style="margin-top: 0; margin-bottom: 20px; font-weight: 600;">${title}</h3>
      ${bodyHtml}
      <p style="margin-top: 28px; font-size: 0.85rem; color: #7a6f6c;">
        Si tenés alguna duda o necesitás reprogramar, respondé este email o escribinos por WhatsApp.
      </p>
    </div>
  `;
}

/**
 * Enviar un email usando el proveedor configurado en .env.local (Resend).
 */
export async function sendEmail({ to, subject, html }) {
  try {
    if (!to) {
      return { success: false, error: 'Falta el email de destino' };
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || 'Las Manitos de Mili <onboarding@resend.dev>';

    if (!resendApiKey) {
      console.warn('⚠️ No hay proveedor de email configurado (falta RESEND_API_KEY en .env.local)');
      return { success: false, error: 'Proveedor de email no configurado' };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('❌ Error al enviar email:', data);
      return { success: false, error: data.message || 'Error al enviar el email' };
    }

    console.log('✅ Email enviado:', data.id);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Excepción al enviar email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 1. Enviar confirmación por email a la clienta cuando se agenda un turno.
 */
export async function sendClientConfirmationEmail(appointment) {
  if (!appointment.client_email) {
    return { success: false, error: 'La clienta no dejó un email' };
  }

  const html = wrapEmailHtml(
    '¡Tu turno está confirmado! ✨',
    `
      <p>¡Hola ${appointment.client_name}!</p>
      <p>Muchísimas gracias por confiar en Las Manitos de Mili. Tu turno quedó registrado con estos datos:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #7a6f6c;">Fecha</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${appointment.appointment_date}</td></tr>
        <tr><td style="padding: 6px 0; color: #7a6f6c;">Hora</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${appointment.appointment_time} hs</td></tr>
        <tr><td style="padding: 6px 0; color: #7a6f6c;">Servicio</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${appointment.service}</td></tr>
      </table>
      <p>¡Te esperamos con los brazos abiertos!</p>
    `
  );

  return sendEmail({
    to: appointment.client_email,
    subject: '¡Tu turno en Las Manitos de Mili está confirmado! 💅',
    html,
  });
}

/**
 * 2. Enviar recordatorio por email a la clienta un día antes del turno.
 */
export async function sendClientReminderEmail(appointment) {
  if (!appointment.client_email) {
    return { success: false, error: 'La clienta no dejó un email' };
  }

  const html = wrapEmailHtml(
    'Recordatorio de tu turno 🌸',
    `
      <p>¡Hola ${appointment.client_name}!</p>
      <p>Te recordamos que <strong>mañana ${appointment.appointment_date}</strong> a las <strong>${appointment.appointment_time} hs</strong> tenés tu turno reservado para <strong>${appointment.service}</strong>.</p>
      <p>Por favor, avisanos con anticipación si tenés algún inconveniente. ¡Nos vemos pronto!</p>
    `
  );

  return sendEmail({
    to: appointment.client_email,
    subject: 'Recordatorio: tu turno en Las Manitos de Mili es mañana',
    html,
  });
}
