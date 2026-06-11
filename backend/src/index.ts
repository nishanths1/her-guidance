import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import alertRoutes from './routes/alertRoutes';
import smsRoutes from './routes/smsRoutes';

dotenv.config();

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/sms', smsRoutes);

// Socket.io Real-time connection
io.on('connection', (socket) => {
  console.log('New client connected', socket.id);

  socket.on('sos_alert', (data) => {
    console.log('SOS Alert Received:', data);
    io.emit('new_alert', data);
  });

  socket.on('update_location', (data) => {
    // data: { alertId, location }
    io.emit('location_updated', data);
  });

  socket.on('lost_device_lockdown', (data) => {
    // data: { alertId, action: 'lockdown' }
    io.emit('trigger_lockdown', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
