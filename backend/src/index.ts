import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import connectDB from './config/database';
import { initializeSocket } from './utils/socket';

import authRoutes from './routes/auth';
import tableRoutes from './routes/tables';
import menuRoutes from './routes/menu';
import orderRoutes from './routes/orders';
import billRoutes from './routes/bills';
import reportRoutes from './routes/reports';
import printRoutes from './routes/print';
import customerRoutes from './routes/customers';
import expenseRoutes from './routes/expenses';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

initializeSocket(server);

app.use(cors({
  origin: ["http://localhost:5173" , "https://roots.crownagi.com"] ,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/print', printRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/expenses', expenseRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Restaurant Management System API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Restaurant Management System is running',
    timestamp: new Date().toISOString()
  });
});''

app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

const startServer = async () => {
  try {
    await connectDB();
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 API available at http://localhost:${PORT}/api`);
      console.log(`🔌 Socket.IO running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();