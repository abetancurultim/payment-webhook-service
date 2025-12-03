import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import paymentRoutes from './routes/paymentRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3032;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/api', paymentRoutes);

app.get('/', (req, res) => {
    res.send('Payment Webhook Service is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});