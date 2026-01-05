import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.SENDGRID_API_KEY,
    },
});

/**
 * Envía una notificación de pago al cliente.
 * @param {string} to - Correo del cliente.
 * @param {object} paymentData - Datos del pago (orderId, statusName, amount, payerName, isSuccess).
 */
export const sendPaymentNotification = async (to, paymentData) => {
    if (!to) {
        console.warn('No se proporcionó correo para enviar la notificación.');
        return;
    }

    const { orderId, statusName, amount, payerName, isSuccess } = paymentData;

    const subject = isSuccess 
        ? `¡Pago Exitoso! - Orden ${orderId}`
        : `Atención: Problema con tu pago - Orden ${orderId}`;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: ${isSuccess ? '#2e7d32' : '#d32f2f'}; text-align: center;">
                ${isSuccess ? '¡Confirmación de Pago!' : 'Notificación de Pago'}
            </h2>
            <p>Hola <strong>${payerName || 'Cliente'}</strong>,</p>
            <p>Te informamos el estado de tu transacción para la orden <strong>${orderId}</strong>:</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Estado:</strong> ${statusName}</p>
                <p><strong>Monto:</strong> $${Number(amount).toLocaleString('es-CO')} COP</p>
                <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CO')}</p>
            </div>

            <p>${isSuccess 
                ? 'Gracias por tu pago. Tu suscripción se ha actualizado correctamente.' 
                : 'Lamentablemente, el pago no pudo ser procesado con éxito. Por favor, intenta nuevamente o contacta a soporte si el problema persiste.'}
            </p>

            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #777; text-align: center;">
                Este es un correo automático, por favor no respondas a este mensaje.
            </p>
        </div>
    `;

    try {
        const info = await transporter.sendMail({
            from: `"Pagos - Grow Marketing" <${process.env.SENDGRID_FROM_EMAIL}>`,
            to,
            subject,
            html: htmlContent,
        });
        console.log(`Correo enviado correctamente a ${to}: ${info.messageId}`);
    } catch (error) {
        console.error('Error enviando correo:', error);
    }
};

/**
 * Envía un correo de bienvenida tras el primer pago exitoso de la suscripción.
 * @param {string} to - Correo del cliente.
 * @param {object} data - Datos para el correo (payerName, orderId, amount).
 */
export const sendWelcomeSubscriptionEmail = async (to, data) => {
    if (!to) return;

    const { payerName, orderId, amount, cc } = data;
    const subject = '¡Bienvenido a tu Suscripción! - Primer Pago Exitoso';

    let htmlContent = '';
    try {
        const templatePath = path.join(__dirname, '../../email.html');
        htmlContent = await fs.readFile(templatePath, 'utf-8');
        // Reemplazar el placeholder o texto genérico con el nombre real
        htmlContent = htmlContent.replace('¡Bienvenido!', `¡Bienvenido, ${payerName || 'Cliente'}!`);
    } catch (err) {
        console.error('Error leyendo plantilla de email:', err);
        return;
    }

    try {
        await transporter.sendMail({
            from: '"Bienestar Plus - Coltefinanciera" <' + process.env.SENDGRID_FROM_EMAIL + '>',
            to,
            cc: cc || "mariana.b@ultimmarketing.com",
            subject,
            html: htmlContent,
        });
        console.log('Correo de bienvenida enviado a ' + to);
    } catch (error) {
        console.error('Error enviando correo de bienvenida:', error);
    }
};