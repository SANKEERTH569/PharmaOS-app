import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { prisma } from './lib/prisma';

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
import stockComplaintsRouter from './routes/stockComplaints';
import adminRouter from './routes/admin';
import schemesRouter from './routes/schemes';
import purchaseOrdersRouter from './routes/purchaseOrders';
import mainWholesalerRouter from './routes/mainWholesaler';
import mainWholesalerSchemesRouter from './routes/mainWholesalerSchemes';
import mainWholesalerLedgerRouter from './routes/mainWholesalerLedger';
import mainWholesalerPaymentsRouter from './routes/mainWholesalerPayments';
import remindersRouter from './routes/reminders';
import salesmenRouter from './routes/salesmen';
import beatRoutesRouter from './routes/beatRoutes';
import callReportsRouter from './routes/callReports';
import performanceRouter from './routes/performance';
import salesmanRegisterRouter from './routes/salesmanRegister';
import salesmanLinksRouter from './routes/salesmanLinks';
import { startReminderCron } from './routes/reminderCron';

const app = express();
const httpServer = http.createServer(app);
// ── Socket.io ──────────────────────────────────────────────────────────────
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = [process.env.CLIENT_URL, 'capacitor://localhost', 'http://localhost', 'https://localhost'];
      if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      callback(null, false);
    },
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
// Create a function to handle multiple CORS origins dynamically
const allowedOrigins = [
  process.env.CLIENT_URL,
  'capacitor://localhost',
  'http://localhost',
  'https://localhost'
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps sometimes send)
    if (!origin) return callback(null, true);

    // Check if the origin matches our allowed list or is localhost on any port
    if (allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }

    callback(null, false);
  },
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
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
app.use('/api/stock-complaints', stockComplaintsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/schemes', schemesRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/main-wholesalers', mainWholesalerRouter);
app.use('/api/main-wholesalers/schemes', mainWholesalerSchemesRouter);
app.use('/api/main-wholesalers/ledger', mainWholesalerLedgerRouter);
app.use('/api/main-wholesalers/payments', mainWholesalerPaymentsRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/salesmen', salesmenRouter);
app.use('/api/beat-routes', beatRoutesRouter);
app.use('/api/call-reports', callReportsRouter);
app.use('/api/performance', performanceRouter);
app.use('/api/auth', salesmanRegisterRouter);
app.use('/api/salesman-links', salesmanLinksRouter);

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    // Make a tiny DB query so the Neon database also never sleeps!
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});
// ── Global error handler ───────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = parseInt(process.env.PORT || '3001', 10);
httpServer.listen(PORT, () => {
  console.log(`✅  Pharma B2B API running on http://localhost:${PORT}`);
  console.log(`🔌  Socket.io ready for real-time connections`);
  startReminderCron();
});
