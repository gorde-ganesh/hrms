// main.ts
import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import https, { Server } from 'https';
import fs from 'fs';
import path from 'path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './src/middlewares/error-handler.middleware';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { logger } from './src/utils/logger';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { startScheduler } from './src/jobs/scheduler';
import { setSocketState } from './src/lib/socket-state';
const swaggerDocument = require('./src/docs/swagger.json');

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { success: false, statusCode: 429, message: 'Too many requests, please try again later.' } });

const port = process.env['API_PORT'] ? Number(process.env['API_PORT']) : 8080;

const app = express();

// ----------------- Load HTTPS Certificates -----------------
const loadHttpsCertificates = () => {
  try {
    return {
      key: fs.readFileSync(path.resolve('./cert/server.key')),
      cert: fs.readFileSync(path.resolve('./cert/server.crt')),
    };
  } catch (error) {
    console.error('❌ SSL certificate load failed:', error);
    process.exit(1);
  }
};

// HTTPS Server
const httpsOptions = loadHttpsCertificates();
const server: Server = https.createServer(httpsOptions, app);

// ----------------- Allowed Origins (env-driven) -----------------
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:4200')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// ----------------- Socket.IO -----------------
const io = new SocketIOServer(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'], credentials: true },
});

// Wire Redis adapter if REDIS_URL is configured
if (process.env.REDIS_URL) {
  try {
    const pubClient = new Redis(process.env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('✅ Socket.IO Redis adapter connected');

    // Track online users in Redis instead of process memory
    const registerUser = async (userId: string, socketId: string) => {
      await pubClient.hset('online_users', userId, socketId);
    };
    const unregisterUser = async (userId: string) => {
      await pubClient.hdel('online_users', userId);
    };
    const getSocketId = async (userId: string): Promise<string | null> => {
      return pubClient.hget('online_users', userId);
    };

    // Expose helpers for use in socket handlers
    (global as any).__redisOnlineUsers = { registerUser, unregisterUser, getSocketId };
    logger.info('✅ Online user state backed by Redis');
  } catch (err) {
    logger.error('❌ Redis connection failed, falling back to in-memory:', err);
  }
}

// Verify JWT on Socket.IO handshake
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace('Bearer ', '');
  const JWT_SECRET = process.env.JWT_KEY;
  if (!token || !JWT_SECRET) {
    return next(new Error('Unauthorized: missing token'));
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
    (socket as any).userId = String(payload.id);
  } catch {
    return next(new Error('Unauthorized: invalid token'));
  }
  next();
});

// Track online users and their rooms (in-memory fallback)
const onlineUsers: Record<string, string> = {};
const userRooms: Record<string, Set<string>> = {}; // userId -> Set of conversationIds

io.on('connection', (socket) => {
  // Use verified identity from JWT, not client-supplied userId
  let currentUserId: string = (socket as any).userId;
  onlineUsers[currentUserId] = socket.id;
  logger.info(`User ${currentUserId} connected with socket ${socket.id}`);

  // Broadcast user online status on connect
  io.emit('user-online', currentUserId);

  // ==================== User Registration ====================
  // 'register' event kept for backwards compatibility but identity
  // is always sourced from the verified JWT, not the payload.
  socket.on('register', (_userId: string) => {
    // currentUserId is already set from JWT — ignore client-supplied value
  });

  // ==================== Chat Messages ====================

  socket.on('sendMessage', (data) => {
    const receiverSocketId = onlineUsers[data.receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('receiveMessage', data);
    }
  });

  // ==================== Typing Indicators ====================

  socket.on(
    'typing',
    (data: { conversationId: string; userId: string; userName: string }) => {
      // Broadcast to all users in the conversation except sender
      socket.broadcast.emit('user-typing', data);
    }
  );

  socket.on(
    'stop-typing',
    (data: { conversationId: string; userId: string }) => {
      socket.broadcast.emit('user-stop-typing', data);
    }
  );

  // ==================== Read Receipts ====================

  socket.on('message-read', (data: { messageId: string; userId: string }) => {
    socket.broadcast.emit('message-read-update', data);
  });

  // ==================== Huddle Signaling ====================

  socket.on(
    'huddle-started',
    (data: { conversationId: string; userId: string }) => {
      socket.broadcast.emit('huddle-started-notification', data);
    }
  );

  socket.on('huddle-join', (data: { huddleId: string; userId: string }) => {
    socket.broadcast.emit('huddle-user-joined', data);
  });

  socket.on(
    'huddle-offer',
    (data: { target: string; offer: RTCSessionDescriptionInit }) => {
      const targetSocketId = onlineUsers[data.target];
      if (targetSocketId) {
        io.to(targetSocketId).emit('huddle-offer', {
          from: currentUserId,
          offer: data.offer,
        });
      }
    }
  );

  socket.on(
    'huddle-answer',
    (data: { target: string; answer: RTCSessionDescriptionInit }) => {
      const targetSocketId = onlineUsers[data.target];
      if (targetSocketId) {
        io.to(targetSocketId).emit('huddle-answer', {
          from: currentUserId,
          answer: data.answer,
        });
      }
    }
  );

  socket.on(
    'huddle-ice-candidate',
    (data: { target: string; candidate: RTCIceCandidateInit }) => {
      const targetSocketId = onlineUsers[data.target];
      if (targetSocketId) {
        io.to(targetSocketId).emit('huddle-ice-candidate', {
          from: currentUserId,
          candidate: data.candidate,
        });
      }
    }
  );

  socket.on('huddle-leave', (data: { huddleId: string; userId: string }) => {
    socket.broadcast.emit('huddle-user-left', data);
  });

  socket.on('huddle-ended', (data: { huddleId: string }) => {
    socket.broadcast.emit('huddle-ended', data);
  });

  // ==================== Call Signaling (1-1) ====================

  socket.on(
    'call-user',
    (data: {
      target: string;
      callId: string;
      callType: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      const targetSocketId = onlineUsers[data.target];
      if (targetSocketId) {
        io.to(targetSocketId).emit('incoming-call', {
          from: currentUserId,
          callId: data.callId,
          callType: data.callType,
          offer: data.offer,
        });
      }
    }
  );

  socket.on(
    'call-answer',
    (data: { target: string; answer: RTCSessionDescriptionInit }) => {
      const targetSocketId = onlineUsers[data.target];
      if (targetSocketId) {
        io.to(targetSocketId).emit('call-answered', {
          answer: data.answer,
        });
      }
    }
  );

  socket.on(
    'ice-candidate',
    (data: { target: string; candidate: RTCIceCandidateInit }) => {
      const targetSocketId = onlineUsers[data.target];
      if (targetSocketId) {
        io.to(targetSocketId).emit('ice-candidate', {
          candidate: data.candidate,
        });
      }
    }
  );

  socket.on('call-ended', (data: { callId: string }) => {
    socket.broadcast.emit('call-ended', data);
  });

  socket.on('call-rejected', (data: { target: string }) => {
    const targetSocketId = onlineUsers[data.target];
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-rejected');
    }
  });

  // ==================== Notifications ====================

  socket.on('sendNotification', (data) => {
    const { employeeIds, type, message } = data;
    employeeIds.forEach((id: string) => {
      const socketId = onlineUsers[id];
      if (socketId) io.to(socketId).emit('notification', { type, message });
    });
  });

  // ==================== Disconnect ====================

  socket.on('disconnect', () => {
    if (currentUserId) {
      delete onlineUsers[currentUserId];
      // Broadcast user offline status
      io.emit('user-offline', currentUserId);
      console.log(`User ${currentUserId} disconnected`);
    }
    console.log('Client disconnected:', socket.id);
  });
});

setSocketState(io, onlineUsers);
export { io, onlineUsers };
// ----------------- Middlewares -----------------
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Request Logger Middleware
const sanitizeBody = (body: any): any => {
  if (!body || typeof body !== 'object') return body;
  const SENSITIVE = ['password', 'oldPassword', 'newPassword', 'confirmPassword', 'token', 'refreshToken'];
  const clean = { ...body };
  SENSITIVE.forEach((k) => { if (k in clean) clean[k] = '[REDACTED]'; });
  return clean;
};

app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    body: sanitizeBody(req.body),
    query: req.query,
    params: req.params,
  });
  next();
});

// Serve uploaded files — requires valid JWT
app.get('/uploads/:filename', (req: Request, res: Response) => {
  const JWT_SECRET = process.env.JWT_KEY;
  const cookieToken = (req as any).cookies?.authToken;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const token = cookieToken || bearerToken;
  if (!token || !JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  const safeName = path.basename(String(req.params.filename));
  res.sendFile(path.join(__dirname, 'uploads', safeName));
});

// ----------------- Health check -----------------
app.get('/api/health', async (_req: Request, res: Response) => {
  let dbStatus = 'connected';
  try {
    await import('./src/lib/prisma').then(({ prisma }) => prisma.$queryRaw`SELECT 1`);
  } catch {
    dbStatus = 'disconnected';
  }
  const pkg = require('./package.json');
  res.status(200).json({ status: 'ok', db: dbStatus, version: pkg.version ?? '0.0.0' });
});

// ----------------- Root route -----------------
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to HRMS' });
});

// ----------------- Load routes dynamically -----------------
const MODULES: string[] = [
  'auth',
  'employee',
  'attendence',
  'leave',
  'leave-balance',
  'global',
  'users',
  'payroll',
  'payroll-component',
  'report',
  'performance',
  'notification',
  'department',
  'designation',
  'chat',
  'huddle',
  'call',
  'dashboard',
  'admin',
  'audit',
  'salary-structure',
];

async function startServer() {
  // ----------------- Start server -----------------
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);

  for (const moduleName of MODULES) {
    try {
      const module = await import(`./src/routes/${moduleName}.route`);
      module.default(app);
      logger.info(`✅ Module loaded: ${moduleName}`);
    } catch (err) {
      logger.error(`❌ Failed to load module ${moduleName}:`, err);
    }
  }

  // 404 Middleware
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: {
        statusCode: 404,
        message: 'Resource not found',
        code: 'NOT_FOUND',
      },
    });
  });

  // Error Handling Middleware
  app.use(errorHandler);
  // Start scheduled jobs
  startScheduler();

  // Start server
  server.listen(port, () => {
    logger.info(`🚀 HTTPS server running on https://localhost:${port}`);
  });
}

// Start everything
startServer();
