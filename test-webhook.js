import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Configuración basada en tu proyecto actual
const PORT = process.env.PORT || 3032;
// La ruta en tu index.js es '/api' y en paymentRoutes.js es '/payments/webhook'
const webhookUrl = `http://localhost:${PORT}/api/payments/webhook`;
const token = process.env.PAYMENTS_WAY_TOKEN;

const mockPayload = {
    // El error 22P02 indica que la columna transaction_id es de tipo bigint (numérico),
    // por lo que no acepta "TRANS-TEST-...". Enviamos un número como string.
    id: Date.now().toString(), 
    externalorder: "ORD-TEST-" + Date.now(),
    amount: 50000,
    fullname: "Usuario de Prueba",
    idstatus: {
        id: 34, // 34 es Aprobada según el código
        nombre: "Aprobada"
    },
    idperson: {
        email: "alejandro.b@ultimmarketing.com",
        phone: "+573045655669",
        firstname: "Alejandro",
        lastname: "Betancur",
        identification: "123456789"
    },
    paymentmethod: {
        id: 2,
        nombre: "PSE"
    },
    ip: "127.0.0.1",
    additionaldata: null
};

async function testWebhook() {
    try {
        console.log('🚀 Iniciando prueba de webhook...');
        console.log('URL:', webhookUrl);
        
        // Verificamos si hay token configurado para enviar el header
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log('🔑 Token de autorización incluido en headers');
        } else {
            console.warn('⚠️ No se encontró PAYMENTS_WAY_TOKEN en .env, enviando sin autenticación (podría fallar si el servidor lo requiere)');
        }

        console.log('Payload:', JSON.stringify(mockPayload, null, 2));

        const response = await axios.post(webhookUrl, mockPayload, { headers });

        console.log('\n✅ Respuesta recibida:');
        console.log('Status:', response.status);
        console.log('Data:', response.data);

    } catch (error) {
        console.error('\n❌ Error en la prueba:');
        if (error.response) {
            // El servidor respondió con un código de estado fuera del rango 2xx
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else if (error.request) {
            // La petición fue hecha pero no se recibió respuesta
            console.error('No se recibió respuesta del servidor. ¿Está corriendo el servidor?');
        } else {
            // Algo pasó al configurar la petición
            console.error('Error:', error.message);
        }
    }
}

testWebhook();
