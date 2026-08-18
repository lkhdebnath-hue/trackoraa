import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { connectRedis } from './config/redis';
import { initQueueWorker } from './services/queueService';
import router from './routes/api';
import { setupSocketHandler } from './sockets/socketHandler';
import { User } from './models/User';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

// Store io instance on express app to access in controllers
app.set('io', io);

// Security and Parsers
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading local uploads in web browser
}));
app.use(cors({ origin: '*' }));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static uploaded attachments
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount API routing
app.use('/api', router);

// Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error.',
  });
});

// Seed Initial Super Admin User if DB is empty
const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'super_admin' });
    if (!adminExists) {
      const defaultAdmin = new User({
        employeeId: 'ADMIN001',
        username: 'admin',
        passwordHash: 'admin123', // Pre-save hooks hashes this
        role: 'super_admin',
        department: 'Administration',
        permissions: ['all'],
        status: 'active',
      });
      await defaultAdmin.save();
      console.log('--- SEEDING --- Default super_admin created: username: admin / password: admin123');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
};

// Startup Sequence
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  // Connect database
  await connectDB();

  // Connect Redis (non-blocking)
  connectRedis();

  // Seed default credentials
  await seedAdmin();

  // Initialize socket handlers
  setupSocketHandler(io);

  // Initialize BullMQ worker
  initQueueWorker();

  server.listen(PORT, () => {
    console.log(`Trackora server running in production mode on port ${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('Server startup failed critical exception:', err);
});
