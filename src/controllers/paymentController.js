import { supabase } from "../config/supabase.js";

export const handlePaymentWebHook = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const expectedToken = process.env.PAYMENTS_WAY_TOKEN;

        if( expectedToken ) {
            if( !authHeader || authHeader !== `Bearer ${expectedToken}` ) {
                console.warn('Unauthorized access attempt to payment webhook');
                return res.status(401).send('Unauthorized');
            }
        }

        const data = req.body;

        if(! data || !data.idstatus || !data.externalorder) {
            console.error('Webhook recibido con datos incompletos:', data);
            return res.status(400).send('Invalid payload');
        }

        const amountVal = data.amount;
        const {
            id: transactionId,
            externalorder: orderId,
            fullname,
            idstatus,
            idperson,
            paymentmethod
        } = data;

        console.log(`Registrando pago de orden ${orderId} - Estado: ${idstatus.nombre}`);

        let userId = null;
        if (idperson) {
            if (idperson.email) {
                const { data: client } = await supabase
                    .from('dentix_clients')
                    .select('id')
                    .eq('email', idperson.email)
                    .maybeSingle();
                if (client) userId = client.id;
            }
            if (!userId && idperson.phone) {
                const { data: client } = await supabase
                    .from('dentix_clients')
                    .select('id')
                    .eq('phone_number', idperson.phone)
                    .maybeSingle();
                if (client) userId = client.id;
            }
        }

        // Guardar log de la transacción
        const { error: dbError } = await supabase
            .from('payment_logs')
            . insert({
                order_id: orderId,
                transaction_id: transactionId,
                amount: amountVal,
                status_id: idstatus.id,
                status_name: idstatus.nombre,
                payer_email: idperson?.email,
                payer_phone: idperson?.phone,
                payer_name: fullname,
                payment_method: paymentmethod?.nombre,
                raw_response: data,
                user_id: userId
            })

        if (dbError) {
            console.error('Error saving payment log:', dbError);
            return res.status(500).json({
                error: 'Database error',
                details: dbError
            })
        }
        
        // 5. Respuesta
        if (idstatus.id === 34) {
            console.log(`Pago completado para la orden ${orderId}`);
            return res.status(200).send('Payment completed');
        }

        return res.status(201).send('Received');

    } catch (error) {
        console.error('Error handling payment webhook:', error);
        res.status(500).send('Internal Server Error');
    }
};

export const healthCheck = (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'Payment Webhook Service',
        timestamp: new Date().toISOString()
    })
};