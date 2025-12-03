import { Router } from 'express';
import { handlePaymentWebHook, healthCheck } from '../controllers/paymentController.js';

const router = Router();

router.post('/payments/webhook', handlePaymentWebHook);
router.get('/payments/health', healthCheck);

export default router;