import 'dotenv/config';
import express, { json } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.js'; // Ajoute .js à la fin

import employeeRoutes from './routes/employees.js';
import paymentRoutes from './routes/payments.js';
import settingsRoutes from './routes/settings.js';
import currencyRoutes from './routes/currency.js';
import companyRoutes from './routes/companies.js';
import schedulerRoutes from './routes/scheduler.js';

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(helmet());
app.use(json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'payroll-backend', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/scheduler', schedulerRoutes);

app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
