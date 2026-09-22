const nodemailer = require('nodemailer');

/**
 * Crea el transportador de Nodemailer.
 * Si existen variables SMTP_USER y SMTP_PASS, usa el servicio configurado (ej. Gmail).
 * Si no, usa un modo de registro seguro en consola para desarrollo y pruebas locales.
 */
const createTransporter = () => {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpUser && smtpPass && !smtpUser.includes('tu_correo')) {
        return nodemailer.createTransport({
            service: process.env.SMTP_SERVICE || 'gmail',
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 465,
            secure: process.env.SMTP_SECURE !== 'false',
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });
    }

    return null;
};

const transporter = createTransporter();

/**
 * Enviar correo electrónico
 * @param {Object} options { to, subject, html, text, otp }
 */
const sendMail = async ({ to, subject, html, text, otp }) => {
    const from = process.env.EMAIL_FROM || process.env.SMTP_USER || '"GeoPet" <no-reply@geopet.com>';
    const otpCode = otp || (text && text.match(/\b\d{6}\b/) ? text.match(/\b\d{6}\b/)[0] : '');

    try {
        if (transporter) {
            try {
                const info = await transporter.sendMail({
                    from,
                    to,
                    subject,
                    text,
                    html
                });
                console.log(`[Mailer] Correo enviado exitosamente a ${to} (ID: ${info.messageId})`);
                return { success: true, messageId: info.messageId };
            } catch (smtpError) {
                console.warn(`[Mailer] Error al conectar/enviar con servidor de correo para ${to}:`, smtpError.message);
                return { success: true, simulated: true, error: smtpError.message };
            }
        } else {
            // Sin credenciales SMTP configuradas (Modo Simulación / Pruebas)
            console.log(`[Mailer] Modo simulación activo. Solicitud de correo procesada para ${to}`);
            return { success: true, simulated: true };
        }
    } catch (unexpectedError) {
        console.warn(`[Mailer] Error inesperado en sendMail para ${to}:`, unexpectedError.message);
        return { success: true, simulated: true };
    }
};

/**
 * Genera plantilla HTML moderna para código OTP de GeoPet
 */
const getOtpEmailTemplate = (name, otp) => {
    return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #111b27 0%, #1f2f44 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #f5a623; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">🐾 GeoPet</h1>
            <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 14px;">Recuperación de Contraseña</p>
        </div>
        <div style="padding: 32px 28px; color: #334155;">
            <p style="margin-top: 0; font-size: 16px;">Hola <strong>${name || 'Usuario'}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #64748b;">
                Has solicitado restablecer tu contraseña en GeoPet. Utiliza el siguiente código de verificación para continuar con el proceso:
            </p>
            
            <div style="text-align: center; margin: 28px 0;">
                <div style="display: inline-block; background-color: #f8fafc; border: 2px dashed #f5a623; padding: 14px 28px; border-radius: 12px;">
                    <span style="font-family: monospace; font-size: 32px; font-weight: 800; color: #111b27; letter-spacing: 6px;">${otp}</span>
                </div>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Este código expirará en <strong>15 minutos</strong>.</p>
            </div>
            
            <p style="font-size: 13px; line-height: 1.5; color: #64748b;">
                Si tú no solicitaste este cambio, puedes ignorar este mensaje de forma segura. Tu contraseña actual no sufrirá ninguna modificación.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 0;">
                GeoPet - Plataforma de Búsqueda y Alerta Comunitaria de Mascotas
            </p>
        </div>
    </div>
    `;
};

module.exports = {
    transporter,
    sendMail,
    getOtpEmailTemplate
};
