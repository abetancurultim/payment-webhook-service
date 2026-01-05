import { sendWelcomeSubscriptionEmail } from './src/services/emailService.js';

const testEmail = async () => {
    console.log('Iniciando prueba de envío de correo...');
    try {
        await sendWelcomeSubscriptionEmail('alejandro.b@ultimmarketing.com', {
            payerName: 'Alejandro Betancur',
            orderId: 'TEST-12345',
            amount: 50000,
            cc: 'mariana.b@ultimmarketing.com'
        });
        console.log('Prueba finalizada.');
    } catch (error) {
        console.error('Error en la prueba:', error);
    }
};

testEmail();
