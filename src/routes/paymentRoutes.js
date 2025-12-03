import { Router } from 'express';
import { handlePaymentWebHook, healthCheck } from '../controllers/paymentController.js';

const router = Router();

router.post('/webhook', handlePaymentWebHook);
router.get('/health', healthCheck);

export default router;