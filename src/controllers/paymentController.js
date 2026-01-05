import { supabase } from "../config/supabase.js";
import { sendPaymentNotification, sendWelcomeSubscriptionEmail } from "../services/emailService.js";

export const handlePaymentWebHook = async (req, res) => {
    try {
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

        const payerName = fullname || (idperson ? `${idperson.firstname || ''} ${idperson.lastname || ''}`.trim() : '');

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
                payer_name: payerName,
                payer_identification: idperson?.identification,
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

        // --- Enviar Notificación por Correo ---
        if (idperson?.email) {
            // No bloqueamos la respuesta del webhook esperando el correo
            sendPaymentNotification(idperson.email, {
                orderId: orderId,
                statusName: idstatus.nombre,
                amount: amountVal,
                payerName: payerName,
                isSuccess: idstatus.id === 34
            }).catch(err => console.error('Error asíncrono en notificación de correo:', err));
        }

        // --- Lógica de Actualización de Suscripción ---
        const identification = idperson?.identification;
        if (identification) {
            try {
                // 1. Buscar la suscripción activa o pendiente para esta persona
                const { data: subscription, error: subError } = await supabase
                    .from('suscripciones')
                    .select('*')
                    .eq('identification_doc', identification)
                    .in('status', ['pending_first_payment', 'active', 'past_due'])
                    .maybeSingle();

                if (subError) {
                    console.error('Error buscando suscripción:', subError);
                } else if (subscription) {
                    const isSuccess = idstatus.id === 34;
                    const updates = {
                        updated_at: new Date().toISOString(),
                        response_data: {
                            last_webhook_payload: data,
                            last_transaction_id: transactionId
                        }
                    };

                    if (isSuccess) {
                        const isFirstPayment = (subscription.installments_paid || 0) === 0 || subscription.status === 'pending_first_payment';
                        const newInstallmentsPaid = (subscription.installments_paid || 0) + 1;
                        updates.installments_paid = newInstallmentsPaid;
                        updates.last_payment_date = new Date().toISOString();
                        
                        // Calcular fecha del próximo pago (1 mes después)
                        const nextDate = new Date();
                        nextDate.setMonth(nextDate.getMonth() + 1);
                        updates.next_payment_date = nextDate.toISOString();

                        // Actualizar estado
                        if (subscription.status === 'pending_first_payment' || subscription.status === 'past_due') {
                            updates.status = 'active';
                        }
                        
                        if (newInstallmentsPaid >= subscription.total_installments) {
                            updates.status = 'completed';
                        }

                        // Guardar ID de transacción inicial si no existe
                        if (!subscription.initial_transaction_id) {
                            updates.initial_transaction_id = transactionId;
                        }

                        // --- Enviar Correo de Bienvenida si es el primer pago ---
                        if (isFirstPayment && idperson?.email) {
                            sendWelcomeSubscriptionEmail(idperson.email, {
                                payerName: payerName,
                                orderId: orderId,
                                amount: amountVal
                            }).catch(err => console.error('Error asíncrono en correo de bienvenida:', err));
                        }
                    } else {
                        // Si el pago no fue exitoso, podríamos marcar como past_due si ya estaba activa
                        if (subscription.status === 'active') {
                            updates.status = 'past_due';
                        }
                    }

                    const { error: updateError } = await supabase
                        .from('suscripciones')
                        .update(updates)
                        .eq('id', subscription.id);

                    if (updateError) {
                        console.error('Error actualizando suscripción:', updateError);
                    } else {
                        console.log(`Suscripción ${subscription.id} actualizada correctamente.`);
                    }
                }
            } catch (err) {
                console.error('Excepción al procesar suscripción:', err);
            }
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