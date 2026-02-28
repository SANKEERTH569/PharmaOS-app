import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';

import authRouter from './routes/auth';
import retailersRouter from './routes/retailers';
import ordersRouter from './routes/orders';
import medicinesRouter from './routes/medicines';
import ledgerRouter from './routes/ledger';
import paymentsRouter from './routes/payments';
import notificationsRouter from './routes/notifications';
import retailerAgenciesRouter from './routes/retailerAgencies';
import wholesalerAgenciesRouter from './routes/wholesalerAgencies';
import marketplaceRouter from './routes/marketplace';
import retailerLedgerRouter from './routes/retailerLedger';
import returnsRouter from './routes/returns';

const app = express();
const httpServer = http.createServer(app);

// ── Socket.io ──────────────────────────────────────────────────────────────
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || /^http:\/\/localhost:\d+$/,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  // Wholesaler/Retailer joins their private room on login
  socket.on('join_room', ({ room }: { room: string }) => {
    socket.join(room);
  });

  socket.on('leave_room', ({ room }: { room: string }) => {
    socket.leave(room);
  });
});

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || /^http:\/\/localhost:\d+$/, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/retailers', retailersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/medicines', medicinesRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/retailer/agencies', retailerAgenciesRouter);
app.use('/api/retailer/ledger', retailerLedgerRouter);
app.use('/api/wholesaler/agencies', wholesalerAgenciesRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/returns', returnsRouter);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Global error handler ───────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = parseInt(process.env.PORT || '3001', 10);
httpServer.listen(PORT, () => {
  console.log(`✅  Pharma B2B API running on http://localhost:${PORT}`);
  console.log(`🔌  Socket.io ready for real-time connections`);
});
